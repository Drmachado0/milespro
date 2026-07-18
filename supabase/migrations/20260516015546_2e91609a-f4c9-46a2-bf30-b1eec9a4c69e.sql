-- Phase 3 W2 (Plan 03-04b) — daily vencimento alert cron (ROADMAP SC#4 + D-T06 #1)
--
-- Schedules send-vencimento-alert to run every day at 08:00 UTC (05:00 BRT).
-- The edge fn scans balances JOIN user_settings (alert_antecipation_days) JOIN
-- user_subscriptions (Pro+ filter) and fan-outs to enqueue-push per match.
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase.
--    NO `CREATE EXTENSION` — same SQLSTATE 2BP01 rationale as prior cron migrations.
--
-- 2. Vault secret presence check. The value itself must be inserted manually:
--      SELECT vault.create_secret('<hex-token>', 'push_vencimento_auth_token');
--    The same token must also exist as edge-function secret
--    PUSH_VENCIMENTO_AUTH_TOKEN.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_vencimento_auth_token') THEN
    RAISE WARNING 'push_vencimento_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''push_vencimento_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-vencimento-alert-daily') THEN
    PERFORM cron.unschedule('send-vencimento-alert-daily');
  END IF;
END $$;

-- 4. Schedule daily 08:00 UTC (05:00 BRT) vencimento scan.
SELECT cron.schedule(
  'send-vencimento-alert-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/send-vencimento-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_vencimento_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);

-- 5. Self-check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-vencimento-alert-daily') THEN
    RAISE EXCEPTION 'send-vencimento-alert-daily cron job not scheduled';
  END IF;
END $$;