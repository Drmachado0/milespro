-- Product tier — the canonical plan axis (Free → Starter → Pro → Agency).
--
-- Consolidation direction (founder decision 2026-07-18): Starter/Pro/Agency are
-- the real paid plans (R$29/79/159), with Free kept as the freemium entry funnel.
-- product_tier is the SINGLE source of truth for BOTH module access and (after
-- the Sprint-3 cutover) billing. It gates product MODULES today via the
-- feature-flag registry (src/config/planModules.ts) and the plan_entitlements
-- table (limits). The legacy subscription_plan (free/pro/vip) + has_plan() keep
-- running the live RLS/Asaas billing UNTIL the Sprint-3 remap retires them —
-- the two coexist during the transition, by design.
--
-- Hierarchy (each a superset of the previous): free < starter < pro < agency
--   'free'    = freemium (personal core, capped usage) — the DEFAULT
--   'starter' = personal paid (personal core, uncapped)
--   'pro'     = consultor/gestor (clients, partner CPFs, per-client reports)
--   'agency'  = elite (promo engine, goals, community, course)
--
-- Bootstrap: existing rows + all new signups default to 'free'. The founder's
-- UUID is flipped to 'agency' via a SEPARATE (chat/CLI-only) UPDATE (see bottom)
-- — same pattern as is_admin (20260513120004): keeps the founder UUID out of
-- source control and lets the migration run idempotently on any environment.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS product_tier text NOT NULL DEFAULT 'free';

-- Constrain to the four canonical values. Mirrors the runtime guard on the TS
-- side (useProductTier sanitizes any non-canonical value back to 'free').
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_product_tier_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_product_tier_check
      CHECK (product_tier IN ('free', 'starter', 'pro', 'agency'));
  END IF;
END $$;

-- Partial index on the professional rows only. The vast majority of users are
-- free/starter; only pro/agency accounts need to be enumerated as a set (future
-- agency-wide tooling / metrics). Keeps the index tiny.
CREATE INDEX IF NOT EXISTS profiles_product_tier_pro_idx
  ON public.profiles (product_tier)
  WHERE product_tier IN ('pro', 'agency');

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'product_tier'
  ) THEN
    RAISE EXCEPTION 'profiles.product_tier not added';
  END IF;
END $$;

-- Post-apply (run manually via Supabase CLI/SQL — DO NOT commit the founder
-- UUID to source control):
--
--   UPDATE public.profiles
--   SET    product_tier = 'agency'
--   WHERE  id = (
--     SELECT id FROM auth.users
--     WHERE email = 'julianosmachado@gmail.com'
--     LIMIT 1
--   );
--
--   -- Verify:
--   SELECT u.email, p.product_tier
--   FROM auth.users u
--   JOIN public.profiles p ON p.id = u.id
--   WHERE p.product_tier <> 'free';
--   -- Expect: exactly 1 row (the founder) for now.
