-- ============================================================================
-- Migration 03: Create public.has_plan(uuid, subscription_plan) trust kernel function
-- Phase: 01-security-foundation-hardening / Plan 04 / Wave 2
-- Requirement: SEC-06
-- Depends on: 20260512120001_consolidate_subscription_plan_enum.sql (canonical 3-value enum)
-- Note: Renumbered from ..120002 to ..120003 (deviation: timestamp-collision-with-plan-02-companion-migration).
--       Plan 02 already shipped ..120001 (enum) + ..120002 (align_subscription_leads_plan_check).
-- ----------------------------------------------------------------------------
-- Forward: Adds the central authorization function that ALL Phase-1 RLS policies
--          call from their WITH CHECK clauses (Plan 05). Pure addition — no data
--          migration, no schema change beyond the function itself.
-- Reverse: DROP FUNCTION IF EXISTS public.has_plan(uuid, public.subscription_plan);
--          (RLS policies created in Plan 05 will hold a dependency reference;
--           if rolling back, drop those policies first via Plan 05's reverse SQL.)
-- Pre-check: SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_plan');
--   Expected: false (function should not exist before this migration)
--
-- Hierarchy semantics (CONTEXT D-01 / RESEARCH §Pattern 5):
--   has_plan(uid, 'free') = true ALWAYS (the 'free' floor)
--   has_plan(uid, 'pro')  = true when user_plan IN ('pro', 'vip')
--   has_plan(uid, 'vip')  = true when user_plan = 'vip'
-- Returns true on no-row found ONLY when _required_plan = 'free'.
--
-- Pitfall 6 reminder: this function ALWAYS reads from public.user_subscriptions
-- (never trusts auth.jwt() ->> 'plan'). After plan changes, the next call returns
-- the new plan because user_subscriptions is the source of truth.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.has_plan(
  _user_id uuid,
  _required_plan public.subscription_plan
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.subscription_plan;
BEGIN
  SELECT plan INTO user_plan
    FROM public.user_subscriptions
   WHERE user_id = _user_id
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now());

  IF user_plan IS NULL THEN
    -- No active subscription = free floor
    RETURN _required_plan = 'free';
  END IF;

  RETURN CASE _required_plan
    WHEN 'free' THEN true
    WHEN 'pro'  THEN user_plan IN ('pro', 'vip')
    WHEN 'vip'  THEN user_plan = 'vip'
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_plan(uuid, public.subscription_plan) FROM public;
GRANT  EXECUTE ON FUNCTION public.has_plan(uuid, public.subscription_plan) TO authenticated;

-- Inline self-check (NO assertion semantics — these are documentation-only SELECTs that
-- log result to migration output for human verification):
DO $$
DECLARE
  fake_uid uuid := '00000000-0000-0000-0000-000000000099';
  result boolean;
BEGIN
  -- For an unknown user, has_plan(_, 'free') should be true (free floor)
  result := public.has_plan(fake_uid, 'free');
  IF result IS NOT TRUE THEN
    RAISE EXCEPTION 'has_plan self-check failed: free floor returned %', result;
  END IF;
  -- For an unknown user, has_plan(_, 'pro') should be false
  result := public.has_plan(fake_uid, 'pro');
  IF result IS NOT FALSE THEN
    RAISE EXCEPTION 'has_plan self-check failed: unknown user returned has_plan(_, pro)=%', result;
  END IF;
  RAISE NOTICE 'has_plan self-check passed';
END $$;

COMMIT;
