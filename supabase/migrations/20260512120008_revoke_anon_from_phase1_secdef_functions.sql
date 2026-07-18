-- ============================================================================
-- Migration 08: Revoke EXECUTE FROM anon on Phase 1 SECURITY DEFINER functions
-- Phase: 01-security-foundation-hardening / followup
-- Requirement: SEC-06 (defense-in-depth follow-up)
-- ----------------------------------------------------------------------------
-- Context:
--   When Migration 3 (create_has_plan_function) and Migration 4
--   (create_managed_accounts_and_can_access_account) were applied via Lovable
--   Cloud, the operator observed that Supabase's default privileges silently
--   GRANT EXECUTE on new public-schema functions to the `anon` role. The
--   original migrations only REVOKEd from `public` (not from the `anon`
--   role), so the resulting ACL still allowed anon to call has_plan() and
--   can_access_account().
--
--   Lovable applied a REVOKE inline as a follow-up at production runtime,
--   but the corresponding statement was never captured in a repo migration.
--   This file backfills that gap so:
--   - `supabase db reset --no-seed` in CI reproduces the final ACL state
--     (anon BLOCKED from both functions).
--   - Future audits can `git log` the security boundary.
--
--   Reference: Phase 1 deploy chat 2026-05-12 (see PR #1 description for
--   the snapshot Lovable ran).
-- ----------------------------------------------------------------------------
-- Threat addressed:
--   Without this REVOKE, an anonymous (un-authenticated) caller could invoke
--   has_plan() and can_access_account() directly via PostgREST RPC. While
--   the function bodies dereference auth.uid() (which would return NULL for
--   anon and yield false), exposing them at all is unnecessary surface area.
--   The defense-in-depth principle: trust kernel functions are for
--   authenticated callers only.
-- ============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.has_plan(uuid, public.subscription_plan) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_account(uuid, uuid) FROM anon;

-- Self-check: confirm anon no longer holds EXECUTE on either function.
DO $$
DECLARE
  has_plan_acl text;
  can_access_acl text;
BEGIN
  SELECT proacl::text INTO has_plan_acl
    FROM pg_proc
   WHERE proname = 'has_plan' AND pronamespace = 'public'::regnamespace;

  IF has_plan_acl LIKE '%anon=X%' THEN
    RAISE EXCEPTION
      'Migration 08 self-check failed: has_plan still grants EXECUTE to anon. ACL: %',
      has_plan_acl;
  END IF;

  SELECT proacl::text INTO can_access_acl
    FROM pg_proc
   WHERE proname = 'can_access_account' AND pronamespace = 'public'::regnamespace;

  IF can_access_acl LIKE '%anon=X%' THEN
    RAISE EXCEPTION
      'Migration 08 self-check failed: can_access_account still grants EXECUTE to anon. ACL: %',
      can_access_acl;
  END IF;

  RAISE NOTICE 'Migration 08: anon EXECUTE successfully revoked from has_plan and can_access_account';
END $$;

COMMIT;

-- ============================================================================
-- Rollback (DISCOURAGED — would re-expose trust kernel to anon):
--   GRANT EXECUTE ON FUNCTION public.has_plan(uuid, public.subscription_plan) TO anon;
--   GRANT EXECUTE ON FUNCTION public.can_access_account(uuid, uuid) TO anon;
-- ============================================================================
