-- Phase 2 W2a (Plan 02-05) — CRIT-04 idempotency primitive
--
-- The (provider, event_id) UNIQUE constraint IS the idempotency mechanism.
-- INSERT-first then side-effects pattern in the webhook handler relies on
-- this constraint throwing SQLSTATE 23505 (unique_violation) on duplicate
-- delivery. The asaas-webhook edge function inspects insertErr.code and
-- short-circuits with HTTP 200 "duplicate ignored" when it sees 23505 —
-- proven empirically in Gate G-CRIT-04 (see plan 02-05 Task 7).
--
-- Future providers (Stripe, MercadoPago, banking direct-Pix) extend the
-- `provider` CHECK list. Single-tenant for v1.
--
-- Idempotent against re-application: every DDL guarded by IF NOT EXISTS so
-- `supabase start` / `supabase db reset` re-runs (e.g. when sidecar DNS
-- flakes mid-startup) do not abort with SQLSTATE 42P07.

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('asaas')),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received'
      CHECK (status IN ('received', 'processing', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retries INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT webhook_events_unique UNIQUE (provider, event_id)
  );

-- Hot-path index for ops queries by event-type history.
CREATE INDEX IF NOT EXISTS webhook_events_type_idx
  ON public.webhook_events (event_type, created_at DESC);

-- Functional index on the Asaas payment.subscription field (Gate G-HIGH-02
-- queries: which active user_subscriptions have at least one PAYMENT_RECEIVED
-- row to back their is_active=true state). Partial — only PAYMENT_* events
-- have a payment.subscription field, so non-payment rows are excluded from
-- the index (saves disk + write amplification).
CREATE INDEX IF NOT EXISTS webhook_events_payload_subscription_idx
  ON public.webhook_events ((payload -> 'payment' ->> 'subscription'))
  WHERE event_type LIKE 'PAYMENT_%';

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies — table is written exclusively by service_role from edge
-- functions (asaas-webhook, reconcile-asaas-subscriptions). The CONSTRAINT
-- itself IS the security boundary; deny-by-default RLS keeps authenticated
-- and anon roles entirely off this table. Future DPO/admin reads happen
-- via service_role through a separate admin edge function.

-- Self-checks (Phase 1 / 2 convention — fail loudly at apply time if any
-- piece of the schema went missing).
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'webhook_events_unique'
        AND conrelid = 'public.webhook_events'::regclass
    ) THEN
    RAISE EXCEPTION 'webhook_events UNIQUE constraint not created';
  END IF;

  IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'webhook_events'
          AND indexname = 'webhook_events_payload_subscription_idx'
      ) THEN
    RAISE EXCEPTION 'webhook_events payload subscription index not created';
  END IF;

  IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'webhook_events'
          AND rowsecurity = true
      ) THEN
    RAISE EXCEPTION 'webhook_events RLS not enabled';
  END IF;
END $$;
