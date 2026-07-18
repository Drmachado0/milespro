-- ============================================================================
-- Phase 2 W2b (Plan 02-06) — TIER-02 Pro alert antecipation
--
-- Forward: Creates the user_settings table (skeleton — one row per user, keyed
--          by auth.users(id)) if it does not yet exist, then adds the
--          alert_antecipation_days column. The column gates how far in advance
--          a vencimento alert can fire (30 / 60 / 90 / 180 days). The default
--          30-day window is open to all plans; the wider 60 / 90 / 180 windows
--          are Pro+ only (enforced by RLS WITH CHECK).
-- Reverse:
--   ALTER TABLE public.user_settings DROP COLUMN IF EXISTS alert_antecipation_days;
--   DROP TABLE IF EXISTS public.user_settings;   -- only if created by this migration
--
-- Why a CHECK constraint (and not a free-form integer):
--   The product UX is a 4-option dropdown; allowing arbitrary integers invites
--   "180 days" entered as 180 by a Pro user but copy-pasted as 1800 by a Free
--   user who bypasses the dropdown. Pin to the canonical 4 values.
--
-- Why a separate WITH CHECK clause for INSERT and UPDATE:
--   Phase 1 HIGH-04 mitigation pattern (avoid RLS escape via UPDATE on an
--   already-existing row). Same Pro-gate logic mirrored on both DML paths.
-- ============================================================================

BEGIN;

-- 1. Skeleton table (created here if not already present). Keyed by auth.users
-- id; ON DELETE CASCADE so user deletion via LGPD path cleans up settings too.
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id     UUID         NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 2. alert_antecipation_days column (idempotent — IF NOT EXISTS lets the
-- migration be re-applied safely on environments that may have partial state).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS alert_antecipation_days INTEGER NOT NULL DEFAULT 30;

-- 3. CHECK constraint — pin to the 4 canonical UX values. Added separately so
-- IF NOT EXISTS on ADD COLUMN doesn't silently skip the constraint on a partial
-- re-apply.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'user_settings_alert_antecipation_check'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_alert_antecipation_check
      CHECK (alert_antecipation_days IN (30, 60, 90, 180));
  END IF;
END $$;

-- 4. RLS policies (recreated idempotently — DROP IF EXISTS guards repeat runs).
DROP POLICY IF EXISTS user_settings_select ON public.user_settings;
CREATE POLICY user_settings_select ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_insert ON public.user_settings;
CREATE POLICY user_settings_insert ON public.user_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Free default: 30 days is always allowed (signup path inserts this row)
      alert_antecipation_days = 30
      OR public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
    )
  );

DROP POLICY IF EXISTS user_settings_update ON public.user_settings;
CREATE POLICY user_settings_update ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      alert_antecipation_days = 30
      OR public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
    )
  );

-- 5. updated_at trigger (matches other tables' convention).
CREATE OR REPLACE FUNCTION public.set_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_settings_updated_at();

-- 6. Self-checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'alert_antecipation_days'
  ) THEN
    RAISE EXCEPTION 'TIER-02 self-check failed: alert_antecipation_days column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'user_settings_alert_antecipation_check'
  ) THEN
    RAISE EXCEPTION 'TIER-02 self-check failed: alert_antecipation CHECK constraint not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'user_settings_update'
  ) THEN
    RAISE EXCEPTION 'TIER-02 self-check failed: user_settings_update policy not created';
  END IF;

  RAISE NOTICE 'TIER-02 self-check passed: alert_antecipation Pro+ gate in place';
END $$;

COMMIT;
