-- Phase 2 W2a (Plan 02-05) — PAY-03 state machine + Asaas reference columns
--
-- Adds the subscription_status enum (RESEARCH §3) and five new columns to
-- user_subscriptions so the asaas-webhook handler can drive state
-- transitions:
--
--   pending_first_charge -> trial (on PAYMENT_CREATED)
--   trial                -> active (on PAYMENT_RECEIVED / PAYMENT_CONFIRMED)
--   active               -> past_due (on PAYMENT_OVERDUE)
--   past_due             -> active (on PAYMENT_RECEIVED — grace cleared)
--   *                    -> canceled (on PAYMENT_REFUNDED, SUBSCRIPTION_DELETED)
--   *                    -> disputed (on PAYMENT_CHARGEBACK_REQUESTED)
--   disputed             -> active (on PAYMENT_AWAITING_CHARGEBACK_REVERSAL)
--
-- Phase 1 already added a SELECT RLS policy (auth.uid() = user_id). No
-- new INSERT/UPDATE policy is added here — the webhook (service_role)
-- is the ONLY writer (D-08 Asaas SoT). Trust kernel posture is unchanged.

-- 1. subscription_status enum (RESEARCH §3 state machine).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'pending_first_charge',
      'trial',
      'active',
      'past_due',
      'canceled',
      'disputed'
    );
  END IF;
END $$;

-- 2. Asaas reference columns (idempotent — IF NOT EXISTS lets the migration
-- be re-applied safely on environments that may have partial state).
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS status                  public.subscription_status,
  ADD COLUMN IF NOT EXISTS asaas_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id   TEXT,
  ADD COLUMN IF NOT EXISTS last_paid_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at    TIMESTAMPTZ;

-- 3. Backfill status for any existing rows (Phase 1 left some active subs
-- from before Asaas integration; treat them as 'active' if currently
-- active+paid, 'canceled' otherwise; free users get NULL — they don't
-- have a payment-state lifecycle).
UPDATE public.user_subscriptions
SET status = CASE
  WHEN is_active = true  AND plan IN ('pro', 'vip') THEN 'active'::public.subscription_status
  WHEN is_active = true  AND plan = 'free'           THEN NULL
  WHEN is_active = false                             THEN 'canceled'::public.subscription_status
  ELSE NULL
END
WHERE status IS NULL;

-- 4. Hot-path indexes
-- Lookup by Asaas subscription id is the inner loop of every webhook
-- delivery (the handler matches incoming payment.subscription against
-- this column). Partial — only rows with an Asaas link.
CREATE INDEX IF NOT EXISTS user_subscriptions_asaas_sub_idx
  ON public.user_subscriptions (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

-- Cron-driven sweep over past_due subs needs to find rows whose grace
-- period has expired. Partial keeps the index tiny — only past_due rows.
CREATE INDEX IF NOT EXISTS user_subscriptions_grace_period_idx
  ON public.user_subscriptions (grace_period_ends_at)
  WHERE grace_period_ends_at IS NOT NULL AND status = 'past_due';

-- 5. Self-checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
      AND column_name = 'asaas_subscription_id'
  ) THEN
    RAISE EXCEPTION 'asaas_subscription_id not added to user_subscriptions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
      AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'status column not added to user_subscriptions';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    RAISE EXCEPTION 'subscription_status enum not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'user_subscriptions'
      AND indexname = 'user_subscriptions_asaas_sub_idx'
  ) THEN
    RAISE EXCEPTION 'user_subscriptions_asaas_sub_idx not created';
  END IF;
END $$;
