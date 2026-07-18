-- ============================================================================
-- TIER-02 — Free plan monthly limit enforcement on operations (data layer)
--
-- Forward: Replace the legacy permissive INSERT policy on public.operations
--          with one that enforces 20 operations/month for Free users. Pro and
--          VIP are unlimited via has_plan(auth.uid(), 'pro') — has_plan
--          covers both ('pro' and 'vip') through the hierarchy in
--          20260512120003_create_has_plan_function.sql.
-- Reverse:
--   DROP POLICY IF EXISTS operations_insert ON public.operations;
--   CREATE POLICY "Users can create their own operations"
--     ON public.operations FOR INSERT WITH CHECK (auth.uid() = user_id);
--   DROP INDEX IF EXISTS public.idx_operations_user_created_at;
--
-- Why now: the limit was previously enforced ONLY client-side in
--          src/hooks/useOperations.ts (checkOperationLimit — SELECT-then-INSERT,
--          racy and bypassable via direct REST). A Free user calling PostgREST
--          could insert unlimited rows. Closes the operations gap that mirrors
--          TIER-01 (20260515120001_tier_rls_free_limits.sql for user_programs
--          and program_accounts).
--
-- Counting semantics:
--   - Calendar month bucket: date_trunc('month', NOW()) <= created_at
--                            < date_trunc('month', NOW()) + INTERVAL '1 month'.
--   - Timezone: UTC (postgres NOW()). Matches the existing client check which
--     also filters by created_at (server-clock'd). Operations near month
--     boundaries may drift up to ~3h from the user's BRT local-time bucket;
--     acceptable trade-off vs. wiring AT TIME ZONE per row.
--   - The sub-SELECT runs through RLS (SECURITY INVOKER on the policy), so it
--     only counts the caller's own rows — no information leak.
--
-- Performance: adds idx_operations_user_created_at so the COUNT subquery
-- stays cheap as histories grow. The existing idx_operations_user_date is on
-- `date` (operation date informed by the user), NOT `created_at` (insert
-- timestamp) — different column, separate index needed.
--
-- Error UX: PostgREST returns SQLSTATE 42501 for RLS denials and the client
-- cannot disambiguate "monthly limit reached" from any other RLS failure.
-- The literal 'free_monthly_operations_limit_exceeded' is embedded in the
-- policy COMMENT so future error-introspection helpers can pattern-match
-- against pg_policies. Same convention as TIER-01.
-- ============================================================================

BEGIN;

-- Drop both the Phase-0 friendly-name policy and any prior canonical-name
-- policy so re-runs are idempotent.
DROP POLICY IF EXISTS "Users can create their own operations" ON public.operations;
DROP POLICY IF EXISTS operations_insert ON public.operations;

CREATE POLICY operations_insert ON public.operations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
      OR
      (
        SELECT COUNT(*)
          FROM public.operations
         WHERE user_id = auth.uid()
           AND created_at >= date_trunc('month', NOW())
           AND created_at <  date_trunc('month', NOW()) + INTERVAL '1 month'
      ) < 20
    )
  );

COMMENT ON POLICY operations_insert ON public.operations IS
  'TIER-02 free_monthly_operations_limit_exceeded: Free users limited to 20 operations per UTC calendar month; Pro+ unlimited via has_plan(pro).';

-- Supporting index for the COUNT subquery above. The existing
-- idx_operations_user_date is on `date` (operation date) and won't help.
CREATE INDEX IF NOT EXISTS idx_operations_user_created_at
  ON public.operations(user_id, created_at);

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operations'
      AND policyname = 'operations_insert'
  ) THEN
    RAISE EXCEPTION 'TIER-02 self-check failed: operations_insert policy not created';
  END IF;
  RAISE NOTICE 'TIER-02 self-check passed: free_monthly_operations_limit_exceeded policy in place';
END $$;

COMMIT;
