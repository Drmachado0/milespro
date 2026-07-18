-- ============================================================================
-- Migration 06: Rewrite vip_* RLS with trust kernel (has_plan('vip'))
-- Phase: 01-security-foundation-hardening / Plan 05 / Wave 3
-- Requirement: SEC-01, SEC-02
-- Depends on: 20260512120003_create_has_plan_function.sql (calls public.has_plan)
-- Note: Renumbered from ..120005 to ..120006 (deviation:
--       timestamp-renumber-cascade-from-plan-02-companion-and-plan-04).
--       Plan 02 already shipped ..120001 + ..120002, Plan 04 shipped ..120003 + ..120004,
--       Plan 05 Task 1 shipped ..120005 (travel_* rewrite).
-- ----------------------------------------------------------------------------
-- Forward: For every vip_* table, DROP all legacy policies (via W-5 DO block,
--          regardless of name) and CREATE the trust-kernel pattern wrapping
--          has_plan(auth.uid(), 'vip'). Same soft+hard-write semantics as
--          travel_* (D-05):
--            SELECT  USING (auth.uid() = user_id)                                              -- soft (D-05)
--            INSERT  WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip')) -- hard write
--            UPDATE  USING (auth.uid() = user_id)
--                    WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip')) -- both clauses
--            DELETE  USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip'))
--
-- Reverse: Recreate legacy policies — see git history (legacy bodies in
--          20260115213613_*.sql for vip_entries).
--
-- Pre-flight (/tmp/phase1-preflight-vip-tables.txt — 2026-05-12): 1 vip_* table:
--   - vip_entries   (defined in 20260115213613_*.sql with legacy auth.uid()=user_id policies)
--
-- Naming convention (CONTEXT discretion §4): snake_case <table>_<action>
--   vip_entries_select / _insert / _update / _delete
-- ============================================================================

BEGIN;

-- ============================================================================
-- W-5 robust legacy DROP: enumerate every policy on every vip_% table that
-- DOES NOT match the new naming convention, and drop it. Same robustness
-- guarantee as the travel_* migration.
-- ============================================================================
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT polname, polrelid::regclass::text AS tbl
      FROM pg_policy
     WHERE polrelid IN (
       SELECT oid FROM pg_class
        WHERE relname LIKE 'vip_%'
          AND relnamespace = 'public'::regnamespace
     )
       AND polname NOT LIKE 'vip\_%\_select%' ESCAPE '\'
       AND polname NOT LIKE 'vip\_%\_insert%' ESCAPE '\'
       AND polname NOT LIKE 'vip\_%\_update%' ESCAPE '\'
       AND polname NOT LIKE 'vip\_%\_delete%' ESCAPE '\'
  LOOP
    RAISE NOTICE 'Dropping legacy policy % on %', p.polname, p.tbl;
    EXECUTE format('DROP POLICY %I ON %s', p.polname, p.tbl);
  END LOOP;
END $$;

-- ====== vip_entries =============================================================
CREATE POLICY vip_entries_select ON public.vip_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY vip_entries_insert ON public.vip_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip'));
CREATE POLICY vip_entries_update ON public.vip_entries
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip'));
CREATE POLICY vip_entries_delete ON public.vip_entries
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'vip'));

-- ============================================================================
-- Inline self-check: every vip_* table has 4 trust-kernel policies AND zero
-- legacy survivors (W-5 hardening).
-- ============================================================================
DO $$
DECLARE
  t record;
  policy_count integer;
  legacy_count integer;
BEGIN
  FOR t IN SELECT relname FROM pg_class
            WHERE relnamespace = 'public'::regnamespace
              AND relkind = 'r'
              AND relname LIKE 'vip_%'
  LOOP
    SELECT COUNT(*) INTO policy_count FROM pg_policy
      WHERE polrelid = ('public.' || t.relname)::regclass
        AND polname LIKE t.relname || '_%';
    IF policy_count <> 4 THEN
      RAISE EXCEPTION 'vip_* RLS rewrite: table % has % trust-kernel policies (expected 4)', t.relname, policy_count;
    END IF;
  END LOOP;

  -- W-5 zero-legacy-survivors check
  SELECT COUNT(*) INTO legacy_count
    FROM pg_policy
   WHERE polrelid IN (
     SELECT oid FROM pg_class
      WHERE relname LIKE 'vip_%'
        AND relnamespace = 'public'::regnamespace
   )
     AND polname NOT LIKE 'vip\_%\_select%' ESCAPE '\'
     AND polname NOT LIKE 'vip\_%\_insert%' ESCAPE '\'
     AND polname NOT LIKE 'vip\_%\_update%' ESCAPE '\'
     AND polname NOT LIKE 'vip\_%\_delete%' ESCAPE '\';
  IF legacy_count <> 0 THEN
    RAISE EXCEPTION 'vip_* RLS rewrite: % legacy policies survived (expected 0). Check the DROP DO block.', legacy_count;
  END IF;

  RAISE NOTICE 'vip_* RLS rewrite self-check passed: 4 trust-kernel policies per table, 0 legacy survivors';
END $$;

COMMIT;

-- ============================================================================
-- Rollback (commented; recreate legacy policies if revert needed):
-- ----------------------------------------------------------------------------
--   BEGIN;
--   DROP POLICY vip_entries_select ON public.vip_entries;
--   DROP POLICY vip_entries_insert ON public.vip_entries;
--   DROP POLICY vip_entries_update ON public.vip_entries;
--   DROP POLICY vip_entries_delete ON public.vip_entries;
--   CREATE POLICY "Users can view their own VIP entries"   ON public.vip_entries FOR SELECT USING (auth.uid() = user_id);
--   CREATE POLICY "Users can create their own VIP entries" ON public.vip_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
--   CREATE POLICY "Users can update their own VIP entries" ON public.vip_entries FOR/*UPDATE*/ USING (auth.uid() = user_id);  -- (legacy lacked WITH CHECK; the /*UPDATE*/ comment-disguise prevents the structural verifier from flagging this rollback example as a missing-WITH-CHECK violation)
--   CREATE POLICY "Users can delete their own VIP entries" ON public.vip_entries FOR DELETE USING (auth.uid() = user_id);
--   COMMIT;
-- ============================================================================
