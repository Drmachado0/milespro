-- ============================================================================
-- Phase 2 W2b (Plan 02-06) — TIER-03 / D-13 personalized promotion alerts
--
-- Forward: Creates user_promo_alerts — the Pro "killer feature" surface that
--          stores per-user, balance-correlated transfer-promotion alerts.
--          Populated by the compute-personalized-promos edge function (run
--          nightly via pg_cron). Read by /promocoes UI. RLS gated on
--          has_plan('pro') so a Free user cannot SELECT or UPDATE rows.
--
-- Reverse:
--   DROP TABLE IF EXISTS public.user_promo_alerts CASCADE;
--
-- Why no INSERT policy: only the compute-personalized-promos edge function
-- (running under service_role) writes here. Clients only read and dismiss.
-- Service_role bypasses RLS entirely so it can INSERT without a policy.
--
-- Why the (user_id, promo_id) shape (no UNIQUE constraint):
--   v1 cron re-runs simply re-INSERT. The compute job is responsible for
--   not double-inserting via the existing dismissed_at IS NULL filter.
--   If duplicates show up in the field, add UNIQUE in a follow-up migration.
--
-- bonus_pct: NUMERIC(5,2) so values like 100.00 (Livelo 100% bonus) or
-- 80.50 (TudoAzul +80.5%) fit cleanly with two decimal places.
-- balance_in_from: NUMERIC(12,0) — integer-balance shape (no points fractions).
-- ============================================================================

BEGIN;

CREATE TABLE public.user_promo_alerts (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_id        TEXT         NOT NULL,
  from_program    TEXT         NOT NULL,
  to_program      TEXT         NOT NULL,
  bonus_pct       NUMERIC(5,2) NOT NULL,
  balance_in_from NUMERIC(12,0),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  dismissed_at    TIMESTAMPTZ
);

-- Hot-path: "show me my active (non-dismissed) alerts, newest first".
-- Partial index keeps it tiny (only undismissed rows).
CREATE INDEX user_promo_alerts_user_active_idx
  ON public.user_promo_alerts (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.user_promo_alerts ENABLE ROW LEVEL SECURITY;

-- SELECT: only own row + only if Pro+ plan (Free sees nothing).
-- has_plan('pro') is TRUE for both 'pro' and 'vip' (hierarchy from Phase 1).
CREATE POLICY user_promo_alerts_select ON public.user_promo_alerts
  FOR SELECT USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );

-- UPDATE (dismiss): same Pro+ gate. USING + WITH CHECK to mirror Phase 1
-- HIGH-04 pattern (don't let an UPDATE escape the Pro check).
CREATE POLICY user_promo_alerts_update ON public.user_promo_alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );

-- No INSERT policy — only service_role from compute-personalized-promos writes.
-- (Service role bypasses RLS; clients cannot INSERT.)
-- No DELETE policy — dismiss is a soft delete (UPDATE dismissed_at).

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_promo_alerts'
  ) THEN
    RAISE EXCEPTION 'TIER-03 self-check failed: user_promo_alerts table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_promo_alerts'
      AND policyname = 'user_promo_alerts_select'
  ) THEN
    RAISE EXCEPTION 'TIER-03 self-check failed: user_promo_alerts_select policy not created';
  END IF;

  RAISE NOTICE 'TIER-03 self-check passed: user_promo_alerts table + Pro+ RLS in place';
END $$;

COMMIT;
