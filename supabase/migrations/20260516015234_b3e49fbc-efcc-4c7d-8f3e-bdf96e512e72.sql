-- Phase 3 W2 (Plan 03-04b) — weekly cleanup of stale push_subscriptions
--
-- Schedules cleanup-push-subscriptions to run every Sunday at 05:00 UTC
-- with body {mode:'sweep'} so the edge fn DELETEs rows where
-- last_seen_at < now() - interval '60 days' (D-T08 defense-in-depth).
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase.
--    NO `CREATE EXTENSION` — same SQLSTATE 2BP01 rationale as prior cron migrations.
--
-- 2. Vault secret presence check. The value itself must be inserted manually:
--      SELECT vault.create_secret('<hex-token>', 'push_cleanup_auth_token');
--    The same token must also exist as edge-function secret
--    PUSH_CLEANUP_AUTH_TOKEN.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cleanup_auth_token') THEN
    RAISE WARNING 'push_cleanup_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''push_cleanup_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-subscriptions-weekly') THEN
    PERFORM cron.unschedule('cleanup-push-subscriptions-weekly');
  END IF;
END $$;

-- 4. Schedule weekly Sunday 05:00 UTC sweep.
SELECT cron.schedule(
  'cleanup-push-subscriptions-weekly',
  '0 5 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/cleanup-push-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cleanup_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('mode', 'sweep', 'source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);

-- 5. Self-check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-subscriptions-weekly') THEN
    RAISE EXCEPTION 'cleanup-push-subscriptions-weekly cron job not scheduled';
  END IF;
END $$;