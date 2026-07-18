-- Phase 2 W0 — D-28 cleanup
--
-- Drop legacy can_access_feature(uuid, text) function. It was re-created in
-- 20260512120001 as a DEPRECATED wrapper for backward compatibility during
-- Phase 1 enum consolidation; Phase 1 SUMMARYs confirm zero callers remain.
-- Grep evidence captured in 02-01-SUMMARY.md:
--   * src/ (excluding generated types.ts) — 0 callers
--   * supabase/functions/ — 0 callers
--   * supabase/migrations/ — only the three historical migrations
--     (20251228134346_, 20260206223931_, 20260512120001_) that previously
--     defined/redefined the function. Safe to drop.
--
-- Trust kernel (Phase 1): callers should use public.has_plan(uid, plan) instead.
-- See supabase/migrations/20260512120003_create_has_plan_function.sql.

DROP FUNCTION IF EXISTS public.can_access_feature(uuid, text) CASCADE;

-- Self-check: function must be gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_access_feature'
  ) THEN
    RAISE EXCEPTION 'can_access_feature still exists after DROP — investigate dependent objects';
  END IF;
END $$;
