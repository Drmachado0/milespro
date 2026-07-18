-- Phase 3 W2 (Plan 03-04b) — MOBILE-04 + ROADMAP SC#4 send-vencimento-alert daily cron
--
-- Closes the gap surfaced by plan-checker iter 1 (2026-05-14): the original
-- single-plan 03-04 lacked this cron despite ROADMAP SC#4 + D-T06 #1 requiring it.
--
-- Daily 08:00 UTC scan of balances for Pro+ users approaching expiry.
-- See supabase/functions/send-vencimento-alert/index.ts for the scan logic
-- (pure findUsersToAlert(...) + thin HTTP wrapper that fans out to enqueue-push).
--
-- Schedule rationale: 08:00 UTC = 05:00 BRT — pushes land early morning so the
-- user sees them when they wake up. Avoids collision with:
--   compute-personalized-promos-nightly @ 02:00 UTC
--   asaas-reconcile-subscriptions @ 03:00 UTC
--   lgpd-delete-cleanup-daily @ 04:00 UTC
--   cleanup-push-subscriptions-weekly @ Sunday 05:00 UTC
--
-- DEVIATION FROM PLAN (Rule 1): the plan specifies filename
-- `20260514120004_schedule_send_vencimento_alert_cron.sql` but that timestamp
-- is already taken by `20260514120004_schedule_asaas_reconcile_cron.sql`
-- (Phase 2 W2a). Renamed to 20260515120007 (after cleanup-push cron @
-- 20260515120006) to keep migration order monotonic without collision.
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase.
--    NO `CREATE EXTENSION` — see plan 02-02 / 02-05 migrations for rationale.
--
-- 2. Vault secret presence check. The value itself must be inserted manually
--    via Lovable Cloud chat / Supabase Studio:
--      SELECT vault.create_secret('<hex-token>', 'push_vencimento_auth_token');
--    The same hex MUST also be set as edge-function secret PUSH_VENCIMENTO_AUTH_TOKEN.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_vencimento_auth_token') THEN
    RAISE WARNING 'push_vencimento_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<hex-token>'', ''push_vencimento_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-vencimento-alert-daily') THEN
    PERFORM cron.unschedule('send-vencimento-alert-daily');
  END IF;
END $$;

-- 4. Schedule daily 08:00 UTC (05:00 BRT). Empty body — the edge function
--    fetches all data internally; no params needed from cron.
SELECT cron.schedule(
  'send-vencimento-alert-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/send-vencimento-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_vencimento_auth_token')
    ),
    body := jsonb_build_object()
  );
  $$
);

-- 5. Self-check — ROADMAP SC#4 closure point.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-vencimento-alert-daily') THEN
    RAISE EXCEPTION 'send-vencimento-alert-daily cron job not scheduled (ROADMAP SC#4 unmet)';
  END IF;
END $$;
