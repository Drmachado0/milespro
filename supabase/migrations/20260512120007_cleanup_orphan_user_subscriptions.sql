-- ============================================================================
-- Migration 07: Cleanup orphan rows in user_subscriptions + add FK to auth.users
-- Phase: 01-security-foundation-hardening / closeout
-- Requirement: SEC-05 (data quality companion to subscription_plan canonicalisation)
-- ----------------------------------------------------------------------------
-- Discovered during Phase 1 closeout: investigation surfaced
-- 21 rows in user_subscriptions vs 13 rows in auth.users — the 8 extras are
-- subscriptions whose user_id no longer exists in auth.users. Root cause:
-- public.user_subscriptions has NO foreign key to auth.users, so when test
-- users were deleted directly from auth.users their subscription rows were
-- left behind.
--
-- This migration is conservative on purpose:
--   1. DELETE the 8 (or current count of) orphans.
--   2. ADD the FK that should have existed from day one, with ON DELETE CASCADE
--      so future user deletions cascade through.
--
-- It does NOT add a partial UNIQUE INDEX on user_id WHERE is_active = true.
-- That is a business-logic decision (do trials overlap paid? does VIP renewal
-- coexist with the previous Pro tier during grace?) that Phase 2 PAY-* owns.
--
-- Safety:
--   - DELETE WHERE NOT EXISTS is idempotent — running twice is a no-op.
--   - ADD CONSTRAINT only fails if orphans still exist, which the prior DELETE
--     prevents (atomic transaction).
--   - Self-check at the end RAISE EXCEPTIONs if any orphan slipped through.
-- ============================================================================

BEGIN;

-- 1. Remove orphan subscriptions (rows whose user_id has no matching auth.users.id).
DELETE FROM public.user_subscriptions us
 WHERE NOT EXISTS (
   SELECT 1 FROM auth.users u WHERE u.id = us.user_id
 );

-- 2. Add the FK with ON DELETE CASCADE so future user deletions clean up.
-- If a constraint with this name already exists (defensive — should not,
-- since the table has zero FKs per the Q5 audit), drop and recreate.
ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Self-check: zero orphans post-cleanup, FK exists.
DO $$
DECLARE
  orphan_count int;
  fk_exists boolean;
BEGIN
  SELECT COUNT(*) INTO orphan_count
    FROM public.user_subscriptions us
    LEFT JOIN auth.users u ON u.id = us.user_id
   WHERE u.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'cleanup_orphan_user_subscriptions self-check failed: % orphan rows still present',
      orphan_count;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = 'user_subscriptions'
       AND c.conname = 'user_subscriptions_user_id_fkey'
       AND c.contype = 'f'
  ) INTO fk_exists;

  IF NOT fk_exists THEN
    RAISE EXCEPTION
      'cleanup_orphan_user_subscriptions self-check failed: FK constraint user_subscriptions_user_id_fkey not present';
  END IF;

  RAISE NOTICE 'cleanup_orphan_user_subscriptions: % orphans removed, FK in place', orphan_count;
END $$;

COMMIT;

-- ============================================================================
-- Rollback (commented):
--   The FK can be dropped at any time:
--     ALTER TABLE public.user_subscriptions
--       DROP CONSTRAINT user_subscriptions_user_id_fkey;
--   The deleted orphan rows are unrecoverable from this migration alone —
--   no backup is kept here. If you need to preserve them for audit, snapshot
--   the table BEFORE running this migration:
--     CREATE TABLE _bk_user_subscriptions_orphans_phase1 AS
--       SELECT us.*, now() AS bk_at FROM public.user_subscriptions us
--       LEFT JOIN auth.users u ON u.id = us.user_id WHERE u.id IS NULL;
-- ============================================================================
