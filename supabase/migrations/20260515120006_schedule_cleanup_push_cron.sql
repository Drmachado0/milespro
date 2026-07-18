-- Phase 3 W2 (Plan 03-04b) — MOBILE-04 push cleanup weekly sweep
--
-- Defense-in-depth: the asaas-webhook downgrade path is the primary cleanup
-- trigger (per-user, immediate). This weekly sweep catches:
--   (a) users whose downgrade webhook was missed
--   (b) tokens not seen in 60+ days (stale uninstalls)
-- Runs Sunday 05:00 UTC — low-load window, no conflict with other crons:
--   compute-personalized-promos-nightly @ 02:00 UTC
--   asaas-reconcile-subscriptions @ 03:00 UTC
--   lgpd-delete-cleanup-daily @ 04:00 UTC
--   send-vencimento-alert-daily @ 08:00 UTC (sibling cron, this plan)
--
-- DEVIATION FROM PLAN (Rule 1): the plan specifies filename
-- `20260514120002_schedule_cleanup_push_cron.sql` but that timestamp is
-- already taken by `20260514120002_extend_user_subscriptions_for_asaas.sql`
-- (Phase 2 W2a). Renamed to 20260515120006 (after push_subscriptions @
-- 20260515120005) to keep migration order monotonic without collision.
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase.
--    NO `CREATE EXTENSION` — see plan 02-02 / 02-05 migrations for the full
--    SQLSTATE 2BP01 rationale.
--
-- 2. Vault secret presence check. The value itself must be inserted manually
--    via Lovable Cloud chat / Supabase Studio:
--      SELECT vault.create_secret('<hex-token>', 'push_cleanup_auth_token');
--    The same hex MUST also be set as edge-function secret PUSH_CLEANUP_AUTH_TOKEN.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cleanup_auth_token') THEN
    RAISE WARNING 'push_cleanup_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<hex-token>'', ''push_cleanup_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-subscriptions-weekly') THEN
    PERFORM cron.unschedule('cleanup-push-subscriptions-weekly');
  END IF;
END $$;

-- 4. Schedule weekly Sunday 05:00 UTC sweep. Hits cleanup-push-subscriptions
--    with body {mode:'sweep'} so the edge function does DELETE WHERE
--    last_seen_at < now() - 60d.
SELECT cron.schedule(
  'cleanup-push-subscriptions-weekly',
  '0 5 * * 0',  -- Sunday 05:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/cleanup-push-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cleanup_auth_token')
    ),
    body := jsonb_build_object('mode', 'sweep')
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
