-- Phase 2 W2b (Plan 02-06) — D-13 nightly personalized-promo cron
--
-- Schedules compute-personalized-promos to run every day at 02:00 UTC
-- (23:00 BRT — same low-traffic window as the 03:00 UTC Asaas reconcile).
-- The edge function reads PROMO_COMPUTE_AUTH_TOKEN from Deno.env; this
-- migration pulls the same value from Vault and signs the HTTP request via
-- net.http_post.
--
-- 1. Required extensions (pg_cron + pg_net) are pre-provisioned by Supabase.
--    NO `CREATE EXTENSION` — see plan 02-02 / 02-05 migrations for the full
--    SQLSTATE 2BP01 rationale (extension already owned by supabase_admin /
--    postgres with GRANTs that conflict with the implicit ownership re-check).
--
-- 2. Vault secret presence check. The value itself must be inserted manually
--    via Lovable Cloud chat / Supabase Studio:
--      SELECT vault.create_secret('<hex-token>', 'promo_compute_auth_token');
--    The same token must also exist as edge-function secret
--    PROMO_COMPUTE_AUTH_TOKEN (via `supabase secrets set ...`).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'promo_compute_auth_token') THEN
    RAISE WARNING 'promo_compute_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''promo_compute_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compute-personalized-promos-nightly') THEN
    PERFORM cron.unschedule('compute-personalized-promos-nightly');
  END IF;
END $$;

-- 4. Schedule daily 02:00 UTC (23:00 BRT). Hits the edge function with the
--    Vault-stored auth token. Both the project ref and the function URL are
--    fixed at the Supabase project level — change here if migrating projects.
SELECT cron.schedule(
  'compute-personalized-promos-nightly',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/compute-personalized-promos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'promo_compute_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);

-- 5. Self-check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compute-personalized-promos-nightly') THEN
    RAISE EXCEPTION 'compute-personalized-promos-nightly cron job not scheduled';
  END IF;
END $$;
