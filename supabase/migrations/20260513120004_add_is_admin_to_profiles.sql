-- Phase 2 W1b — TEL-02 admin gate for mrr-dashboard.
--
-- Add is_admin column to profiles. Bootstrap: the founder's UUID gets
-- flipped to true via a SEPARATE (chat-only) UPDATE statement, NOT
-- hard-coded in this migration. Rationale: keep founder UUID out of
-- source control; allows the migration to run idempotently on any
-- environment (dev, staging, prod) without leaking PII.
--
-- The mrr-dashboard edge function reads this column with the
-- service-role client (RLS bypass) — defense in depth alongside the
-- client-side check in src/pages/AdminMetrics.tsx.
--
-- Coordinated with Plan 02-02 Task 2: the existing profiles_select
-- RLS policies (one named "Users can view their own profile" + one
-- named profiles_select with the can_access_account branch) remain
-- valid. is_admin is a per-row attribute readable by the owner only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Partial index on is_admin = true. The table is small but the lookup
-- is hot path on every /admin/metrics request (and on every
-- mrr-dashboard invocation). Partial index keeps it tiny — only the
-- admin rows are indexed.
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx
  ON public.profiles (is_admin)
  WHERE is_admin = true;

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'profiles.is_admin not added';
  END IF;
END $$;

-- Post-apply (run manually in Lovable Cloud chat — DO NOT commit the
-- founder UUID to source control):
--
--   UPDATE public.profiles
--   SET    is_admin = true
--   WHERE  id = (
--     SELECT id FROM auth.users
--     WHERE email = 'julianosmachado@gmail.com'
--     LIMIT 1
--   );
--
--   -- Verify:
--   SELECT u.id, u.email
--   FROM auth.users u
--   JOIN public.profiles p ON p.id = u.id
--   WHERE p.is_admin = true;
--   -- Expect: exactly 1 row (the founder).
