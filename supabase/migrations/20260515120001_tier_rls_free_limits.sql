-- ============================================================================
-- Phase 2 W2b (Plan 02-06) — TIER-01 / D-12 Free plan limits at the data layer
--
-- Forward: Replaces the existing user_programs INSERT policy and adds a parallel
--          one to program_accounts so a Free user is blocked from creating more
--          than 3 user_programs or more than 5 program_accounts. Pro / VIP
--          override via the trust-kernel `has_plan(auth.uid(), 'pro')` check
--          (VIP also returns true through the hierarchy).
-- Reverse:
--   DROP POLICY IF EXISTS user_programs_insert ON public.user_programs;
--   DROP POLICY IF EXISTS program_accounts_insert ON public.program_accounts;
--   -- (the Phase 1 'Users can insert own programs' policy is also dropped here;
--   --  restore via the original 20260129145715 migration if needed.)
--
-- Why now: closes CRITICAL-01 from the codebase concerns file (plan gating today
-- is enforced ONLY in the React layer in useSubscription.canAddProgram; a direct
-- REST call would bypass the limit). The trust kernel from Phase 1 is in place
-- and `has_plan()` already exists; this migration is just policy plumbing.
--
-- Counts are evaluated inside the WITH CHECK clause as a sub-SELECT against the
-- same table (user_programs / program_accounts respectively). RLS executes the
-- check as the caller via SECURITY INVOKER, so the sub-SELECT also goes through
-- RLS and counts ONLY the caller's rows — no information leak.
--
-- Hierarchy semantics (Phase 1 has_plan):
--   has_plan(uid, 'pro') is TRUE for both 'pro' and 'vip' plans (cf. CONTEXT D-01).
-- So a single `has_plan('pro')` short-circuit covers Pro+ unlimited.
--
-- Error UX: PostgREST returns SQLSTATE 42501 for RLS failures; the client cannot
-- distinguish "free limit reached" from "any other RLS denial". The literal
-- string 'free_plan_limit_exceeded' is embedded in the policy name so future
-- error-introspection helpers can pattern-match against pg_policies / the
-- error's `details` field.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. user_programs INSERT — Free <3 limit + Pro+ override
-- ----------------------------------------------------------------------------

-- Drop ALL pre-existing INSERT policies (the Phase 1 migration used a friendly
-- name; this plan replaces it with the snake_case grep-able convention).
DROP POLICY IF EXISTS "Users can insert own programs" ON public.user_programs;
DROP POLICY IF EXISTS user_programs_insert ON public.user_programs;

CREATE POLICY user_programs_insert ON public.user_programs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Pro+ unlimited (covers 'pro' and 'vip' via has_plan hierarchy)
      public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
      OR
      -- Free: enforce count < 3 (free_plan_limit_exceeded)
      (SELECT COUNT(*) FROM public.user_programs WHERE user_id = auth.uid()) < 3
    )
  );

COMMENT ON POLICY user_programs_insert ON public.user_programs IS
  'TIER-01 free_plan_limit_exceeded: Free users limited to 3 user_programs rows; Pro+ unlimited via has_plan(pro).';

-- ----------------------------------------------------------------------------
-- 2. program_accounts INSERT — Free <5 limit + Pro+ override
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_accounts') THEN
    -- Drop the Phase 1 friendly-name policy + any prior canonical-name policy.
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own accounts" ON public.program_accounts';
    EXECUTE 'DROP POLICY IF EXISTS program_accounts_insert ON public.program_accounts';

    EXECUTE $POLICY$
      CREATE POLICY program_accounts_insert ON public.program_accounts
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND (
            public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
            OR
            (SELECT COUNT(*) FROM public.program_accounts WHERE user_id = auth.uid()) < 5
          )
        )
    $POLICY$;

    EXECUTE $POLICY$
      COMMENT ON POLICY program_accounts_insert ON public.program_accounts IS
        'TIER-01 free_plan_limit_exceeded: Free users limited to 5 program_accounts rows; Pro+ unlimited via has_plan(pro).'
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Self-checks
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_programs'
      AND policyname = 'user_programs_insert'
  ) THEN
    RAISE EXCEPTION 'TIER-01 self-check failed: user_programs_insert policy not created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_accounts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'program_accounts'
        AND policyname = 'program_accounts_insert'
    ) THEN
      RAISE EXCEPTION 'TIER-01 self-check failed: program_accounts_insert policy not created';
    END IF;
  END IF;

  RAISE NOTICE 'TIER-01 self-check passed: free_plan_limit_exceeded policies in place';
END $$;

COMMIT;
