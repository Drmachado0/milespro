-- Phase 3 W2 — MOBILE-04 push notifications
-- D-T08 — push_subscriptions table with own-row RLS, partial UNIQUE,
--         service-role-only cleanup path on downgrade + SIGNED_OUT (Plan 03-04b + 03-05)
--
-- Idempotent: every DDL guarded by IF NOT EXISTS (or equivalent guard for CREATE
-- POLICY which lacks the syntax). Re-applying this migration on an environment
-- that already has the table is a no-op. This was learned the hard way after
-- Lovable Cloud duplicated this migration into a UUID-named file on first apply
-- (see memory: feedback_lovable_migration_pattern). The duplicate was deleted,
-- but the idempotency guards remain so future re-application (supabase db reset,
-- DR rebuild, second Lovable apply attempt) does not abort with 42P07.

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token    TEXT,
  platform        TEXT         NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version     TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Partial UNIQUE: prevent duplicate device_token for the same user, allow NULL token
-- (intermediate state during permission-granted-but-token-not-yet-received).
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_token_uniq
  ON public.push_subscriptions (user_id, device_token)
  WHERE device_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Own-row policies — NO has_plan gate at table level. Free users may have tokens
-- registered for payment_event + onboarding pushes. The Pro+ event-type gating
-- lives in enqueue-push (Plan 03-04b).
--
-- CREATE POLICY does not support IF NOT EXISTS, so we wrap each in a guard
-- that checks pg_policies before creation.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_select') THEN
    CREATE POLICY push_subscriptions_select ON public.push_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_insert') THEN
    CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_update') THEN
    CREATE POLICY push_subscriptions_update ON public.push_subscriptions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_delete') THEN
    CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Self-checks (run regardless of whether DDL above was no-op or actual CREATE).
DO $$
DECLARE
  _p TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: push_subscriptions table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'push_subscriptions_user_token_uniq') THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: partial UNIQUE index missing';
  END IF;

  FOREACH _p IN ARRAY ARRAY['push_subscriptions_select', 'push_subscriptions_insert', 'push_subscriptions_update', 'push_subscriptions_delete'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = _p) THEN
      RAISE EXCEPTION 'MOBILE-04 self-check failed: policy % not created', _p;
    END IF;
  END LOOP;

  RAISE NOTICE 'MOBILE-04 self-check passed: push_subscriptions + 4 RLS policies + partial UNIQUE';
END $$;

COMMIT;
