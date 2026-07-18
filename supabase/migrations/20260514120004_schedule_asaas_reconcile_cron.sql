-- Phase 2 W2a (Plan 02-05) — D-09 daily Asaas reconcile cron
--
-- Schedules reconcile-asaas-subscriptions to run every day at 03:00 UTC
-- (00:00 BRT — middle of the night, no user load). The edge function reads
-- ASAAS_RECONCILE_AUTH_TOKEN from Deno.env; this migration pulls the same
-- value from Vault and signs the HTTP request via net.http_post.
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase
-- and managed via Dashboard → Database → Extensions.
--
-- Why no `CREATE EXTENSION IF NOT EXISTS`: when the extension already exists,
-- Supabase's managed roles trigger a SQLSTATE 2BP01 "dependent privileges
-- exist" check on the re-validation step, because pg_cron's schema `cron`
-- has GRANTs already assigned to `supabase_admin` / `postgres` that conflict
-- with the implicit ownership re-check during `CREATE EXTENSION`. The fix
-- is to NOT issue the statement at all in managed Supabase environments
-- (mirrors plan 02-02 migration 20260513120003_schedule_lgpd_delete_cron.sql).
--
-- If running on a fresh self-hosted Postgres without pg_cron, run as
-- superuser BEFORE this migration:
--   CREATE EXTENSION pg_cron WITH SCHEMA extensions;
--   CREATE EXTENSION pg_net  WITH SCHEMA extensions;

-- 2. Vault secret presence check. The value itself must be inserted
--    manually via Lovable Cloud chat / Supabase Studio:
--      SELECT vault.create_secret('<hex-token>', 'asaas_reconcile_auth_token');
--    The same token must also exist as edge-function secret
--    ASAAS_RECONCILE_AUTH_TOKEN (via `supabase secrets set ...`).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'asaas_reconcile_auth_token') THEN
    RAISE WARNING 'asaas_reconcile_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''asaas_reconcile_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'asaas-reconcile-nightly') THEN
    PERFORM cron.unschedule('asaas-reconcile-nightly');
  END IF;
END $$;

-- 4. Schedule daily 03:00 UTC (00:00 BRT). Hits the edge function with the
--    Vault-stored auth token. Both the project ref and the function URL are
--    fixed at the Supabase project level — change here if migrating projects.
SELECT cron.schedule(
  'asaas-reconcile-nightly',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/reconcile-asaas-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'asaas_reconcile_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);

-- 5. Self-check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'asaas-reconcile-nightly') THEN
    RAISE EXCEPTION 'asaas-reconcile-nightly cron job not scheduled';
  END IF;
END $$;
