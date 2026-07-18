-- ============================================================================
-- Migration 04: Create managed_accounts table + can_access_account function
-- Phase: 01-security-foundation-hardening / Plan 04 / Wave 2
-- Requirement: SEC-06 (TIER-06 table+RLS portion only — UI deferred to Phase 2)
-- Depends on: 20260512120003_create_has_plan_function.sql (uses public.has_plan in RLS)
-- Note: Renumbered from ..120003 to ..120004 (deviation: timestamp-collision-with-plan-02-companion-migration).
--       Plan 02 already shipped ..120001 (enum) + ..120002 (align_subscription_leads_plan_check).
-- ----------------------------------------------------------------------------
-- Forward: Creates the table that backs multi-CPF (VIP feature) and the
--          can_access_account() function that policies query for cross-user reads.
--          NO UI in this phase (deferred to Phase 2 per CONTEXT §deferred-3).
-- Reverse: DROP TABLE IF EXISTS public.managed_accounts CASCADE;
--          DROP FUNCTION IF EXISTS public.can_access_account(uuid, uuid);
-- Pre-check: SELECT to_regclass('public.managed_accounts');  -- expect: NULL
--
-- Isolation semantics (CONTEXT D-06):
--   - SELF access (viewer = target): always permitted (handled by viewer = target check)
--   - Owner->managed access (viewer = owner of an unrevoked managed_accounts row pointing
--     at target): permitted IF viewer has 'vip' plan
--   - Revoked relationship (revoked_at IS NOT NULL): HARD isolation — row becomes
--     immediately invisible to the owner. Different from plan downgrade (D-05) which
--     is soft (SELECT continues to work post-downgrade).
--
-- Schema rationale:
--   - owner_user_id: VIP user who controls the relationship
--   - managed_user_id: headless auth.users row (created in Phase 2 by create-managed-account
--     edge function; for Phase 1, executed via direct admin API in tests)
--   - label: human-readable nickname for the managed person
--   - revoked_at: nullable timestamp; UPDATE to non-null is the "revoke" action
--   - UNIQUE(owner_user_id, managed_user_id): prevents duplicate relationships
-- ============================================================================

BEGIN;

-- 1. Table -------------------------------------------------------------------
CREATE TABLE public.managed_accounts (
  id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  managed_user_id   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label             TEXT         NOT NULL,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT managed_accounts_no_self CHECK (owner_user_id <> managed_user_id),
  CONSTRAINT managed_accounts_unique_pair UNIQUE (owner_user_id, managed_user_id)
);

CREATE INDEX managed_accounts_owner_idx   ON public.managed_accounts (owner_user_id) WHERE revoked_at IS NULL;
CREATE INDEX managed_accounts_managed_idx ON public.managed_accounts (managed_user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.managed_accounts ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies ------------------------------------------------------------
-- Naming convention (CONTEXT discretion §4 — snake_case grep-able):
--   managed_accounts_select / _insert / _update / _delete
--
-- Soft-isolation pattern for SELECT (D-05): owner sees their managed rows even after
--   plan downgrade — but cannot create/modify (D-05 hard write boundary via has_plan).
-- HARD-isolation for revoked relationships (D-06): handled inside can_access_account(),
--   not at the managed_accounts SELECT policy. The owner can still see their own
--   revoked rows in managed_accounts (audit trail), but can_access_account() returns
--   false so they cannot reach the managed user's data.

CREATE POLICY managed_accounts_select ON public.managed_accounts
  FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY managed_accounts_insert ON public.managed_accounts
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND public.has_plan(auth.uid(), 'vip')
  );

CREATE POLICY managed_accounts_update ON public.managed_accounts
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (
    auth.uid() = owner_user_id
    AND public.has_plan(auth.uid(), 'vip')
  );

CREATE POLICY managed_accounts_delete ON public.managed_accounts
  FOR DELETE
  USING (
    auth.uid() = owner_user_id
    AND public.has_plan(auth.uid(), 'vip')
  );

-- 3. updated_at trigger (matches the convention used by other tables) --------
CREATE OR REPLACE FUNCTION public.set_managed_accounts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER managed_accounts_updated_at
  BEFORE UPDATE ON public.managed_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_managed_accounts_updated_at();

-- 4. can_access_account() ---------------------------------------------------
-- Returns TRUE if viewer can act on target's data.
-- Self-access always permitted (covers normal single-CPF case for free/pro/vip).
-- Cross-user access requires:
--   (a) viewer has 'vip' plan (has_plan check)
--   (b) an unrevoked managed_accounts row links viewer (owner) -> target (managed)

CREATE OR REPLACE FUNCTION public.can_access_account(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Self-access: cheapest check first
  IF _viewer_id = _target_id THEN
    RETURN true;
  END IF;

  -- Cross-user access: viewer must be VIP AND have an unrevoked managed_accounts row
  IF NOT public.has_plan(_viewer_id, 'vip') THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.managed_accounts
     WHERE owner_user_id   = _viewer_id
       AND managed_user_id = _target_id
       AND revoked_at IS NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_account(uuid, uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.can_access_account(uuid, uuid) TO authenticated;

-- 5. Inline self-check (documentation + cheap insurance) --------------------
DO $$
DECLARE
  fake_a uuid := '00000000-0000-0000-0000-00000000a001';
  fake_b uuid := '00000000-0000-0000-0000-00000000a002';
  result boolean;
BEGIN
  -- Self-access for unknown user: still true (viewer = target, no managed_accounts lookup)
  result := public.can_access_account(fake_a, fake_a);
  IF result IS NOT TRUE THEN
    RAISE EXCEPTION 'can_access_account self-check failed: self-access returned %', result;
  END IF;
  -- Cross-user without managed_accounts row + without VIP plan: false
  result := public.can_access_account(fake_a, fake_b);
  IF result IS NOT FALSE THEN
    RAISE EXCEPTION 'can_access_account self-check failed: cross-access returned %', result;
  END IF;
  RAISE NOTICE 'can_access_account self-check passed';
END $$;

COMMIT;
