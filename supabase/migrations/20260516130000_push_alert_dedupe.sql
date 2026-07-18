-- Idempotency log for send-vencimento-alert (P1-6 pre-launch audit fix).
--
-- The daily expiry-alert cron previously had no dedupe. If pg_cron retried
-- the job (5xx during fan-out, manual operator re-fire for QA, or a rare
-- duplicate schedule), the same Pro/VIP user got the same expiry push
-- twice, eroding trust in our notification quality.
--
-- Pattern mirrors `webhook_events` (Plan 02-05 CRIT-04): INSERT-first with
-- a UNIQUE primary key; the SQLSTATE 23505 violation IS the dedupe signal.
-- Caller skips enqueue-push on 23505 and keeps a clean fan-out counter.

CREATE TABLE IF NOT EXISTS public.push_alert_dedupe (
  user_id    UUID NOT NULL,
  balance_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  sent_on    DATE NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, balance_id, event_type, sent_on)
);

COMMENT ON TABLE public.push_alert_dedupe IS
  'Idempotency log for send-vencimento-alert. PK (user_id, balance_id, event_type, sent_on) '
  'guarantees one push per balance per event-type per day. Operator can DELETE rows for the '
  'current day to force a re-send during incident recovery.';

-- RLS: service-role only. Users have no business querying this table.
ALTER TABLE public.push_alert_dedupe ENABLE ROW LEVEL SECURITY;

-- No policies = no access for authenticated/anon roles. Service role bypasses RLS
-- and is the only writer (send-vencimento-alert edge fn).

-- Retention: keep ~90 days of dedupe history for operational forensics. Earlier
-- rows can be pruned by a periodic cleanup (no cron registered here; the table
-- size is bounded by (active_pro_users × balances × 2_event_types × 90 days)
-- which is small in v1 — defer cleanup automation to backlog.
