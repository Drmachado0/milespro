-- Phase 2 W1a (Plan 02-02) — pg_cron daily LGPD cleanup (COMPL-02 hard-delete)
--
-- Hard-delete users who confirmed deletion >7 days ago. Runs once daily at
-- 04:00 UTC (01:00 BRT). The edge function reads
-- `LGPD_CLEANUP_AUTH_TOKEN` from Deno.env; this migration pulls the same
-- value from Vault and signs the HTTP request via net.http_post.

-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase
-- and managed via Dashboard → Database → Extensions.
--
-- Why no `CREATE EXTENSION IF NOT EXISTS`: when the extension already exists,
-- Supabase's managed roles trigger a SQLSTATE 2BP01 "dependent privileges
-- exist" check on the re-validation step, because pg_cron's schema `cron`
-- has GRANTs already assigned to `supabase_admin` / `postgres` that conflict
-- with the implicit ownership re-check during `CREATE EXTENSION`. The fix
-- is to NOT issue the statement at all in managed Supabase environments
-- (verified by the Lovable snapshot 20260513154806 that omits these lines).
--
-- If running this migration on a fresh self-hosted Postgres without pg_cron,
-- run as superuser BEFORE this migration:
--   CREATE EXTENSION pg_cron WITH SCHEMA extensions;
--   CREATE EXTENSION pg_net  WITH SCHEMA extensions;

-- 2. Vault secret presence check (the value itself must be inserted manually
--    via Lovable Cloud chat / Supabase Studio:
--      SELECT vault.create_secret('<hex-token>', 'lgpd_cleanup_auth_token');
--    The same token must also exist as edge-function secret
--    LGPD_CLEANUP_AUTH_TOKEN (via `supabase secrets set ...`).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'lgpd_cleanup_auth_token') THEN
    RAISE WARNING 'lgpd_cleanup_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''lgpd_cleanup_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lgpd-delete-cleanup-daily') THEN
    PERFORM cron.unschedule('lgpd-delete-cleanup-daily');
  END IF;
END $$;

-- 4. Schedule daily 04:00 UTC (01:00 BRT). Hits the edge function with the
--    Vault-stored auth token. Both the project ref and the function URL are
--    fixed at the Supabase project level — change here if migrating projects.
SELECT cron.schedule(
  'lgpd-delete-cleanup-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-delete-cleanup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lgpd_cleanup_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);

-- 5. Self-check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lgpd-delete-cleanup-daily') THEN
    RAISE EXCEPTION 'lgpd-delete-cleanup-daily cron job not scheduled';
  END IF;
END $$;
