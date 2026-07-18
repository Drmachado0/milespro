-- Phase 3 W2 (Plan 03-05) — MOBILE-04 push permission idempotency column
--
-- D-T07: contextual prompt fires once per user; this column persists the
-- "user has been asked" state so we never re-prompt (iOS only gives one shot
-- at the native permission dialog). Set on FIRST requestPermission call,
-- regardless of grant/deny outcome (iOS HIG).
--
-- NOTE on filename timestamp: the plan called for filename
-- `20260514120003_user_settings_push_pre_prompt.sql` but that slot is taken
-- by Phase 2 W2a (`20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql`).
-- We use the next safe monotonic slot AFTER the most recent Lovable migration
-- (`20260516023851_*`). Content is unchanged from the plan spec. This is the
-- same Rule-1 deviation pattern that Plan 03-04b hit when its cron migrations
-- collided (renamed 20260514120002/04 → 20260515120006/07). Documented in
-- 03-05-SUMMARY.md.

BEGIN;

-- user_settings is created by Plan 02-06 migration 20260515120002.
-- This migration only adds a column; safe to run even on fresh installs because
-- the prior migration is a prerequisite and runs first by timestamp order.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_pre_prompt_seen_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.user_settings.push_pre_prompt_seen_at IS
  'D-T07: timestamp when the user was shown the contextual push permission pre-prompt. NULL = never asked. NOT NULL = asked once, regardless of grant/deny outcome (iOS HIG: do not re-ask).';

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'push_pre_prompt_seen_at'
  ) THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: push_pre_prompt_seen_at column not added';
  END IF;
  RAISE NOTICE 'MOBILE-04 self-check passed: user_settings.push_pre_prompt_seen_at exists';
END $$;

COMMIT;
