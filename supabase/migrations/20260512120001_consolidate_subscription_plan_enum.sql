-- ============================================================================
-- Migration 01: Consolidate subscription_plan enum 5 -> 3 (free, pro, vip)
-- Phase: 01-security-foundation-hardening / Plan 02 / Wave 1
-- Requirement: SEC-05
-- ----------------------------------------------------------------------------
-- Forward (CONTEXT D-01):
--   agency       -> vip
--   pro_familia  -> vip   (backfilled to agency in step 0, then mapped to vip in step 5)
--   basic        -> pro   (backfilled to pro in step 0)
--   free         -> free  (no-op)
--   pro          -> pro   (no-op)
--
-- Reverse: see commented rollback at the bottom of this file.
-- Pre-check: SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan;
--   (results captured in PR description before migration runs in Plan 06 BLOCKING
--    task — see /tmp/phase1-preflight-plan-counts.txt for the static analysis
--    that authorized this migration's authoring step.)
--
-- Safety: ALL DDL in one transaction. Postgres DDL is fully transactional; the only
-- ALTER TYPE operation that CANNOT be in a transaction with use is the forbidden
-- additive enum pattern (the one that adds a single value with `ADD_VALUE`). We
-- use the recreate-type pattern instead (RENAME old / CREATE new / ALTER COLUMN ... USING / DROP old).
-- See RESEARCH §Pattern 5 + Pitfall 2.
-- ============================================================================

BEGIN;

-- 0. Backfill DATA before type change so the cast in step 5 sees only mappable values.
UPDATE public.user_subscriptions
   SET plan = 'pro'::public.subscription_plan
 WHERE plan = 'basic'::public.subscription_plan;

UPDATE public.user_subscriptions
   SET plan = 'agency'::public.subscription_plan  -- intermediate; mapped to 'vip' in step 5
 WHERE plan = 'pro_familia'::public.subscription_plan;

-- 1. DROP functions that depend on the enum type signature (CASCADE is safe — preflight in
--    Task 1 confirmed no generated columns or functional indexes depend on these).
DROP FUNCTION IF EXISTS public.get_user_plan(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_feature(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.can_create_operation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.count_monthly_operations(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Drop column default (cannot ALTER TYPE while default uses old type).
ALTER TABLE public.user_subscriptions ALTER COLUMN plan DROP DEFAULT;

-- 3. Rename old type out of the way.
ALTER TYPE public.subscription_plan RENAME TO subscription_plan_old;

-- 4. Create the new canonical type.
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'vip');

-- 5. Convert column with CASE-based USING expression (semantic mapping per D-01).
ALTER TABLE public.user_subscriptions
  ALTER COLUMN plan TYPE public.subscription_plan
  USING (
    CASE plan::text
      WHEN 'free'   THEN 'free'::public.subscription_plan
      WHEN 'pro'    THEN 'pro'::public.subscription_plan
      WHEN 'agency' THEN 'vip'::public.subscription_plan
      ELSE 'free'::public.subscription_plan  -- safety net; should never hit after step 0 backfill
    END
  );

-- 6. Restore the default with the new type.
ALTER TABLE public.user_subscriptions ALTER COLUMN plan SET DEFAULT 'free'::public.subscription_plan;

-- 7. Drop the old type (now unused).
DROP TYPE public.subscription_plan_old;

-- 8. Recreate dropped functions against the new type.
--    Bodies preserved from the original migrations (20251228134346, 20260206223931) with
--    the enum collapsed to free/pro/vip.

CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS public.subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions
      WHERE user_id = _user_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())),
    'free'::public.subscription_plan
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;

-- handle_new_user: replicate analog from 20260206223931_*.sql:12-63 with the canonical enum.
-- Tier-specific INSERT defaults are collapsed: 'vip' (formerly pro_familia/agency) uses the
-- highest limits; 'pro' (formerly basic) uses unlimited mid-tier limits; 'free' is bounded.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initial_plan public.subscription_plan;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
    ON CONFLICT (id) DO NOTHING;

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'standard')
    ON CONFLICT DO NOTHING;

  -- Check for initial_plan in metadata, default to 'free'
  initial_plan := COALESCE(
    (NEW.raw_user_meta_data ->> 'initial_plan')::public.subscription_plan,
    'free'::public.subscription_plan
  );

  -- Create subscription with appropriate limits based on plan
  INSERT INTO public.user_subscriptions (
    user_id, plan, max_users, max_operations_per_month, max_programs, history_days
  )
  VALUES (
    NEW.id,
    initial_plan,
    CASE
      WHEN initial_plan = 'vip' THEN 999
      WHEN initial_plan = 'pro' THEN 5
      ELSE 1
    END,
    CASE
      WHEN initial_plan IN ('pro', 'vip') THEN NULL
      ELSE 20
    END,
    CASE
      WHEN initial_plan IN ('pro', 'vip') THEN NULL
      ELSE 5
    END,
    CASE
      WHEN initial_plan = 'vip' THEN NULL
      WHEN initial_plan = 'pro' THEN 365
      ELSE 90
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- count_monthly_operations: bring back the analog from 20260206223931_*.sql with same body
-- (no enum reference inside; recreated only because it was dropped CASCADE in step 1).
CREATE OR REPLACE FUNCTION public.count_monthly_operations(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
    FROM public.operations
   WHERE user_id = _user_id
     AND date_trunc('month', created_at) = date_trunc('month', now());
$$;

-- can_create_operation: same body as legacy migration; check uses get_user_plan + count_monthly_operations.
-- (Phase-2 will likely revisit this against per-tier limits; for Phase 1 we recreate as-is.)
CREATE OR REPLACE FUNCTION public.can_create_operation(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.subscription_plan;
  max_ops integer;
  current_ops integer;
BEGIN
  SELECT plan, max_operations_per_month
    INTO user_plan, max_ops
    FROM public.user_subscriptions
   WHERE user_id = _user_id AND is_active = true;

  -- Unlimited for pro and vip
  IF user_plan IN ('pro', 'vip') THEN
    RETURN true;
  END IF;

  -- Check limit for free plan
  IF max_ops IS NULL THEN
    RETURN true;
  END IF;

  SELECT public.count_monthly_operations(_user_id) INTO current_ops;

  RETURN current_ops < max_ops;
END;
$$;

-- can_access_feature: legacy gate kept for backward compatibility (CONTEXT deferred §item-7
-- says "mark DEPRECATED, remove in Phase 2/3"). Recreate against the new enum.
CREATE OR REPLACE FUNCTION public.can_access_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.subscription_plan;
BEGIN
  SELECT public.get_user_plan(_user_id) INTO user_plan;
  -- DEPRECATED: superseded by has_plan() landing in Plan 04. Remove in Phase 2 or 3.
  RETURN CASE
    WHEN _feature IN ('agency', 'multi_clients', 'receipts', 'api', 'white_label', 'multi_cpf')
      THEN user_plan = 'vip'
    WHEN _feature IN ('reports', 'simulators', 'unlimited_operations', 'travel')
      THEN user_plan IN ('pro', 'vip')
    ELSE true
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_feature(uuid, text) FROM public;
GRANT  EXECUTE ON FUNCTION public.can_access_feature(uuid, text) TO authenticated;

-- Re-attach handle_new_user trigger to auth.users.
-- The trigger was dropped together with the function via CASCADE in step 1.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ============================================================================
-- Rollback (commented; use only if invariant pre-check fails on prod):
-- ----------------------------------------------------------------------------
--   BEGIN;
--   ALTER TABLE public.user_subscriptions ALTER COLUMN plan DROP DEFAULT;
--   ALTER TYPE public.subscription_plan RENAME TO subscription_plan_v2;
--   CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'agency', 'pro_familia', 'basic');
--   ALTER TABLE public.user_subscriptions ALTER COLUMN plan TYPE public.subscription_plan
--     USING (
--       CASE plan::text
--         WHEN 'vip' THEN 'agency'::public.subscription_plan
--         WHEN 'pro' THEN 'pro'::public.subscription_plan
--         ELSE 'free'::public.subscription_plan
--       END
--     );
--   ALTER TABLE public.user_subscriptions ALTER COLUMN plan SET DEFAULT 'free'::public.subscription_plan;
--   DROP TYPE public.subscription_plan_v2;
--   -- (recreate the legacy function bodies — see git history of this file for source:
--   --  supabase/migrations/20251228134346_*.sql for get_user_plan, can_access_feature,
--   --  can_create_operation, count_monthly_operations; supabase/migrations/20260206223931_*.sql
--   --  for the legacy handle_new_user with basic/pro_familia branches.)
--   COMMIT;
-- ============================================================================
