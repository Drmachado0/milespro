-- Phase 2 W1a (Plan 02-02) — COMPL-02 (D-18) soft-delete + 7-day cancellation window + audit
--
-- Adds 3 columns to profiles, creates deletion_audit table, and adjusts the profiles
-- SELECT RLS surface so soft-deleted users are hidden from VIP managed_account owners
-- (the user themselves still sees their data until hard-delete via D-18 cron).

-- 1. Soft-delete columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_token         TEXT;

CREATE INDEX IF NOT EXISTS profiles_deletion_pending_idx
  ON public.profiles (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL AND deletion_confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_deletion_cleanup_idx
  ON public.profiles (deletion_confirmed_at)
  WHERE deletion_confirmed_at IS NOT NULL;

-- 2. deletion_audit table — survives the user's data; no FK on deleted_user_id
--    since the auth.users row gets purged.
CREATE TABLE public.deletion_audit (
  id                          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted_user_id             UUID         NOT NULL,
  requested_at                TIMESTAMPTZ  NOT NULL,
  confirmed_at                TIMESTAMPTZ  NOT NULL,
  hard_deleted_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  asaas_customer_deleted_at   TIMESTAMPTZ,
  posthog_person_deleted_at   TIMESTAMPTZ,
  sentry_user_deleted_at      TIMESTAMPTZ,
  row_counts_deleted          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_audit ENABLE ROW LEVEL SECURITY;
-- No policies on deletion_audit — only service_role (from lgpd-delete-cleanup edge
-- function) inserts; DPO admin reads via separate tooling (out of scope here).

-- 3. profiles SELECT RLS — soft-hide deleted users from OTHER viewers
--    Original policy (from 20251127134056) was "Users can view their own profile"
--    USING (auth.uid() = id) — only self could ever read profiles. This migration
--    KEEPS the self-only policy AND adds a second policy `profiles_select` that
--    grants read access to VIP managed_account owners ONLY when the target is
--    NOT in a soft-delete window. RLS policies on the same command are OR-ed,
--    so the net effect is: self always allowed; cross-account allowed only when
--    can_access_account() AND deletion_requested_at IS NULL.
--
--    We do NOT drop the original "Users can view their own profile" policy — it
--    is the canonical guarantee that a user can always see their own row, even
--    during the 7-day deletion window (D-18 reversal flow).
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id                              -- self always allowed (redundant w/ existing policy)
    OR (
      deletion_requested_at IS NULL              -- not in deletion window
      AND public.can_access_account(auth.uid(), id)  -- VIP multi-CPF aware (Phase 1 trust kernel)
    )
  );

-- Self-checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deletion_requested_at'
  ) THEN
    RAISE EXCEPTION 'profiles.deletion_requested_at not added';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deletion_confirmed_at'
  ) THEN
    RAISE EXCEPTION 'profiles.deletion_confirmed_at not added';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deletion_token'
  ) THEN
    RAISE EXCEPTION 'profiles.deletion_token not added';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deletion_audit') THEN
    RAISE EXCEPTION 'deletion_audit not created';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select'
  ) THEN
    RAISE EXCEPTION 'profiles_select policy not present after rebuild';
  END IF;
END $$;
