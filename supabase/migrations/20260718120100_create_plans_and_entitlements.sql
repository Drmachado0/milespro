-- Sprint 1 — Plan catalog + entitlements (feature flags & limits).
--
-- Additive foundation for the Starter/Pro/Agency consolidation. Does NOT touch
-- subscription_plan, has_plan(), or any existing RLS — those keep running the
-- live billing until the Sprint-3 cutover. Adapted to Asaas (NOT Stripe): a plan
-- is priced by value + cycle, so there is no stripe_price_id — create-checkout-
-- session will read monthly_price / yearly_price from here to build the Asaas
-- subscription.

BEGIN;

-- ============================================================================
-- plans — catalog of the four canonical tiers with Asaas pricing (BRL).
-- plan_type mirrors profiles.product_tier (free/starter/pro/agency).
-- ============================================================================
-- Allowed set enforced by a CHECK (no separate plan_type domain table).
CREATE TABLE IF NOT EXISTS public.plans (
  plan_type     text PRIMARY KEY
                CHECK (plan_type IN ('free', 'starter', 'pro', 'agency')),
  name          text NOT NULL,
  monthly_price numeric(10,2),
  yearly_price  numeric(10,2),
  description   text,
  is_purchasable boolean NOT NULL DEFAULT true, -- free is not checkout-purchasable
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (plan_type, name, monthly_price, yearly_price, description, is_purchasable, sort_order)
VALUES
  ('free',    'Free',    0,    0,    'Gestão pessoal de milhas com limites — porta de entrada.', false, 0),
  ('starter', 'Starter', 29,   290,  'Gestão pessoal completa, sem limites.',                     true,  1),
  ('pro',     'Pro',     79,   790,  'Consultor/gestor: clientes, CPFs de parceiros, relatórios por cliente.', true, 2),
  ('agency',  'Agency',  159,  1590, 'Operação + inteligência: promoções, metas, comunidade e curso.',        true, 3)
ON CONFLICT (plan_type) DO UPDATE
  SET name = EXCLUDED.name,
      monthly_price = EXCLUDED.monthly_price,
      yearly_price = EXCLUDED.yearly_price,
      description = EXCLUDED.description,
      is_purchasable = EXCLUDED.is_purchasable,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- ============================================================================
-- plan_entitlements — per-tier feature flags + limits. `limit_count` (NOT the
-- reserved word `limit`): NULL = unlimited, 0 = disabled/none.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id          bigserial PRIMARY KEY,
  plan_type   text NOT NULL REFERENCES public.plans (plan_type) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  limit_count integer,                 -- NULL = unlimited
  UNIQUE (plan_type, feature_key)
);

-- Feature matrix (product spec). Personal modules are implicit (every tier has
-- them, capped by usage limits elsewhere); this table governs the PROFESSIONAL
-- gates: clients, cpf_partners, affiliates, promotions, community, course.
INSERT INTO public.plan_entitlements (plan_type, feature_key, enabled, limit_count)
VALUES
  -- Free — personal only, nothing professional
  ('free', 'clients',      false, 0),
  ('free', 'cpf_partners', false, 0),
  ('free', 'affiliates',   false, 0),
  ('free', 'promotions',   false, 0),
  ('free', 'community',    false, 0),
  ('free', 'course',       false, 0),
  -- Starter — same as Free on the professional axis (personal paid)
  ('starter', 'clients',      false, 0),
  ('starter', 'cpf_partners', false, 0),
  ('starter', 'affiliates',   false, 0),
  ('starter', 'promotions',   false, 0),
  ('starter', 'community',    false, 0),
  ('starter', 'course',       false, 0),
  -- Pro — consultor: clients/partners/affiliates enabled with limits;
  -- promotions/community/course still gated (upgrade to Agency)
  ('pro', 'clients',      true, 30),
  ('pro', 'cpf_partners', true, 50),
  ('pro', 'affiliates',   true, 10),
  ('pro', 'promotions',   false, 0),
  ('pro', 'community',    false, 0),
  ('pro', 'course',       false, 0),
  -- Agency — everything unlimited (NULL limit)
  ('agency', 'clients',      true, NULL),
  ('agency', 'cpf_partners', true, NULL),
  ('agency', 'affiliates',   true, NULL),
  ('agency', 'promotions',   true, NULL),
  ('agency', 'community',    true, NULL),
  ('agency', 'course',       true, NULL)
ON CONFLICT (plan_type, feature_key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      limit_count = EXCLUDED.limit_count;

-- ============================================================================
-- Read policies: plans + entitlements are non-secret catalog data. Any
-- authenticated user may read them (the pricing page + gating hooks need them).
-- ============================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select ON public.plans;
CREATE POLICY plans_select ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS plan_entitlements_select ON public.plan_entitlements;
CREATE POLICY plan_entitlements_select ON public.plan_entitlements
  FOR SELECT USING (true);

-- (No INSERT/UPDATE/DELETE policies → only service-role/admin can mutate the
--  catalog, which is what we want.)

-- ============================================================================
-- Entitlement helper functions — the DB-side gate the Sprint-2 RLS policies
-- will call. They read profiles.product_tier (the canonical axis) and join
-- plan_entitlements. SECURITY DEFINER + fixed search_path, matching has_plan().
-- ============================================================================

-- Is `_feature` enabled for the user's current tier?
CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT e.enabled
       FROM public.plan_entitlements e
       JOIN public.profiles p ON p.product_tier = e.plan_type
      WHERE p.id = _user_id
        AND e.feature_key = _feature),
    false
  );
$$;

-- Would creating one more of `_feature` stay within the tier's limit?
-- Enabled + (unlimited OR current_count < limit_count).
CREATE OR REPLACE FUNCTION public.within_entitlement_limit(
  _user_id uuid,
  _feature text,
  _current_count integer
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ent RECORD;
BEGIN
  SELECT e.enabled, e.limit_count
    INTO ent
    FROM public.plan_entitlements e
    JOIN public.profiles p ON p.product_tier = e.plan_type
   WHERE p.id = _user_id
     AND e.feature_key = _feature;

  -- No matching entitlement row (or disabled) → not allowed. `ent.enabled IS
  -- NOT TRUE` covers both the NOT FOUND case (all fields NULL) and enabled=false.
  IF ent.enabled IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- NULL limit = unlimited
  IF ent.limit_count IS NULL THEN
    RETURN true;
  END IF;

  RETURN _current_count < ent.limit_count;
END;
$$;

-- Specialization for the clients CRM (travel_clients is the existing table).
-- Mirrors the product spec's can_create_client: false if disabled, else respect
-- the tier's client limit against the user's current travel_clients count.
CREATE OR REPLACE FUNCTION public.can_create_client(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM public.travel_clients
   WHERE user_id = _user_id;

  RETURN public.within_entitlement_limit(_user_id, 'clients', current_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_entitlement(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.within_entitlement_limit(uuid, text, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.can_create_client(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.has_entitlement(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.within_entitlement_limit(uuid, text, integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.can_create_client(uuid) TO authenticated;

-- ============================================================================
-- Self-checks
-- ============================================================================
DO $$
DECLARE
  n_plans integer;
  n_ent integer;
BEGIN
  SELECT COUNT(*) INTO n_plans FROM public.plans;
  IF n_plans <> 4 THEN
    RAISE EXCEPTION 'plans seed: expected 4 rows, got %', n_plans;
  END IF;

  SELECT COUNT(*) INTO n_ent FROM public.plan_entitlements;
  IF n_ent <> 24 THEN
    RAISE EXCEPTION 'plan_entitlements seed: expected 24 rows (4 tiers x 6 features), got %', n_ent;
  END IF;

  -- Agency has clients unlimited (enabled + NULL limit)
  IF NOT EXISTS (
    SELECT 1 FROM public.plan_entitlements
    WHERE plan_type = 'agency' AND feature_key = 'clients'
      AND enabled = true AND limit_count IS NULL
  ) THEN
    RAISE EXCEPTION 'plan_entitlements seed: agency/clients should be enabled + unlimited';
  END IF;

  RAISE NOTICE 'plans + plan_entitlements seed self-check passed';
END $$;

COMMIT;
