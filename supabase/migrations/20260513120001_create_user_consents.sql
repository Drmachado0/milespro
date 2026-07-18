-- Phase 2 W1a (Plan 02-02) — COMPL-03 (D-16) consent banner + COMPL-01 rate-limit table
--
-- user_consents: append-only consent log per LGPD Art. 8 §4 (granular checkboxes).
-- lgpd_export_log: rate-limit table for COMPL-01 (1 export/hour/user).

CREATE TABLE public.user_consents (
  id                   UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version      TEXT         NOT NULL,
  terms_accepted_at    TIMESTAMPTZ,
  privacy_accepted_at  TIMESTAMPTZ,
  analytics_opted_in   BOOLEAN      NOT NULL DEFAULT false,
  marketing_opted_in   BOOLEAN      NOT NULL DEFAULT false,
  ip_address           INET,
  user_agent           TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX user_consents_user_idx ON public.user_consents (user_id, created_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- SELECT: user reads own consent log only
CREATE POLICY user_consents_select ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: user writes own consent only
CREATE POLICY user_consents_insert ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE / no DELETE policies — append-only by design (LGPD audit trail)
-- LGPD Art. 8 §4 requires evidence of consent; revoking is modeled as a NEW INSERT
-- with opted_in flags flipped, not as an UPDATE/DELETE of prior rows.

-- lgpd_export_log: tracks COMPL-01 export requests for rate limiting + auditing
CREATE TABLE public.lgpd_export_log (
  id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  row_counts    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX lgpd_export_log_user_idx ON public.lgpd_export_log (user_id, created_at DESC);

ALTER TABLE public.lgpd_export_log ENABLE ROW LEVEL SECURITY;

-- SELECT: user reads own export history
CREATE POLICY lgpd_export_log_select ON public.lgpd_export_log
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT writes happen via service_role only (edge function); no policy for authenticated.
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.

-- Self-checks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_consents') THEN
    RAISE EXCEPTION 'user_consents not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lgpd_export_log') THEN
    RAISE EXCEPTION 'lgpd_export_log not created';
  END IF;
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_consents') < 2 THEN
    RAISE EXCEPTION 'user_consents missing required policies (select + insert)';
  END IF;
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lgpd_export_log') < 1 THEN
    RAISE EXCEPTION 'lgpd_export_log missing select policy';
  END IF;
END $$;
