-- ============================================================================
-- Migration 05: Rewrite travel_* RLS with trust kernel (has_plan)
-- Phase: 01-security-foundation-hardening / Plan 05 / Wave 3
-- Requirement: SEC-01, SEC-02
-- Depends on: 20260512120003_create_has_plan_function.sql (calls public.has_plan)
-- Note: Renumbered from ..120004 to ..120005 (deviation:
--       timestamp-renumber-cascade-from-plan-02-companion-and-plan-04).
--       Plan 02 already shipped ..120001 + ..120002, Plan 04 shipped ..120003 + ..120004.
-- ----------------------------------------------------------------------------
-- Forward: For every travel_* table:
--   1. Drop EVERY existing policy whose name doesn't match the new convention
--      <table>_(select|insert|update|delete) -- uses a DO block that enumerates
--      pg_policy directly (W-5: robust against typos / forgotten legacy variants /
--      future drift). The legacy "Users can view their own cruises" style policies
--      are caught regardless of exact wording.
--   2. CREATE the trust-kernel-wrapped pattern:
--        SELECT  USING (auth.uid() = user_id)                                                -- soft isolation (D-05)
--        INSERT  WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'))   -- hard write boundary
--        UPDATE  USING (auth.uid() = user_id)
--                WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'))   -- both clauses (HIGH-04 mitigation)
--        DELETE  USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'))
--
-- Reverse: Recreate the legacy auth.uid() = user_id policies via 20260131123615_*.sql
--          (kept in git history -- see commented rollback at bottom of this file).
--
-- Pre-check: SELECT polrelid::regclass, polname FROM pg_policy
--            WHERE polrelid IN (SELECT oid FROM pg_class WHERE relname LIKE 'travel_%' AND relnamespace = 'public'::regnamespace);
--   (committed in PR description before this migration runs -- see /tmp/phase1-preflight-travel-tables.txt)
--
-- Authoritative travel_* table list (from /tmp/phase1-preflight-travel-tables.txt, 10 tables):
--   travel_attractions, travel_car_rentals, travel_clients, travel_cruises,
--   travel_hotel_reservations, travel_insurances, travel_quotes, travel_receivables,
--   travel_tickets, travel_transfers
--
-- travel_clients decision (PLAN §1.2 — Option A): travel_clients gets the same
-- has_plan(_, 'pro') boundary. Free users cannot create clients => cannot create
-- downstream travel_* rows (no client_id to reference). Plan 06 seeds via service-role.
--
-- Naming convention (CONTEXT discretion §4): snake_case <table>_<action>
--   travel_cruises_select / _insert / _update / _delete  (NOT "Users can view their own cruises")
-- ============================================================================

BEGIN;

-- ============================================================================
-- W-5 robust legacy DROP: enumerate every policy on every travel_% table that
-- DOES NOT match the new naming convention, and drop it. This is more robust
-- than per-name DROP IF EXISTS because it catches:
--   - Legacy "Users can view their own X" variants we forgot to enumerate
--   - Custom one-off policies added outside the standard 4
--   - Renamed policies from previous migration attempts
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
        WHERE relname LIKE 'travel_%'
          AND relnamespace = 'public'::regnamespace
     )
       AND polname NOT LIKE 'travel\_%\_select%' ESCAPE '\'
       AND polname NOT LIKE 'travel\_%\_insert%' ESCAPE '\'
       AND polname NOT LIKE 'travel\_%\_update%' ESCAPE '\'
       AND polname NOT LIKE 'travel\_%\_delete%' ESCAPE '\'
  LOOP
    RAISE NOTICE 'Dropping legacy policy % on %', p.polname, p.tbl;
    EXECUTE format('DROP POLICY %I ON %s', p.polname, p.tbl);
  END LOOP;
END $$;

-- ====== travel_clients (parent table — same pattern; FK target for every other travel_*) ====
CREATE POLICY travel_clients_select ON public.travel_clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_clients_insert ON public.travel_clients
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_clients_update ON public.travel_clients
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_clients_delete ON public.travel_clients
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_cruises ===========================================================
CREATE POLICY travel_cruises_select ON public.travel_cruises
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_cruises_insert ON public.travel_cruises
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_cruises_update ON public.travel_cruises
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_cruises_delete ON public.travel_cruises
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_attractions =======================================================
CREATE POLICY travel_attractions_select ON public.travel_attractions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_attractions_insert ON public.travel_attractions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_attractions_update ON public.travel_attractions
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_attractions_delete ON public.travel_attractions
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_car_rentals =======================================================
CREATE POLICY travel_car_rentals_select ON public.travel_car_rentals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_car_rentals_insert ON public.travel_car_rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_car_rentals_update ON public.travel_car_rentals
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_car_rentals_delete ON public.travel_car_rentals
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_hotel_reservations ================================================
CREATE POLICY travel_hotel_reservations_select ON public.travel_hotel_reservations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_hotel_reservations_insert ON public.travel_hotel_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_hotel_reservations_update ON public.travel_hotel_reservations
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_hotel_reservations_delete ON public.travel_hotel_reservations
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_insurances ========================================================
CREATE POLICY travel_insurances_select ON public.travel_insurances
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_insurances_insert ON public.travel_insurances
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_insurances_update ON public.travel_insurances
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_insurances_delete ON public.travel_insurances
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_quotes ============================================================
CREATE POLICY travel_quotes_select ON public.travel_quotes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_quotes_insert ON public.travel_quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_quotes_update ON public.travel_quotes
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_quotes_delete ON public.travel_quotes
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_receivables =======================================================
CREATE POLICY travel_receivables_select ON public.travel_receivables
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_receivables_insert ON public.travel_receivables
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_receivables_update ON public.travel_receivables
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_receivables_delete ON public.travel_receivables
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_tickets ===========================================================
CREATE POLICY travel_tickets_select ON public.travel_tickets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_tickets_insert ON public.travel_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_tickets_update ON public.travel_tickets
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_tickets_delete ON public.travel_tickets
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ====== travel_transfers =========================================================
CREATE POLICY travel_transfers_select ON public.travel_transfers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_transfers_insert ON public.travel_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_transfers_update ON public.travel_transfers
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_transfers_delete ON public.travel_transfers
  FOR DELETE USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

-- ============================================================================
-- Inline self-check: confirm every travel_* table now has exactly 4 trust-kernel policies
-- AND zero legacy survivors (W-5 hardening — the DROP DO block above MUST have worked).
-- ============================================================================
DO $$
DECLARE
  t record;
  policy_count integer;
  legacy_count integer;
BEGIN
  -- Per-table trust-kernel count check
  FOR t IN SELECT relname FROM pg_class
            WHERE relnamespace = 'public'::regnamespace
              AND relkind = 'r'
              AND relname LIKE 'travel_%'
  LOOP
    SELECT COUNT(*) INTO policy_count FROM pg_policy
      WHERE polrelid = ('public.' || t.relname)::regclass
        AND polname LIKE t.relname || '_%';
    IF policy_count <> 4 THEN
      RAISE EXCEPTION 'travel_* RLS rewrite: table % has % trust-kernel policies (expected 4)', t.relname, policy_count;
    END IF;
  END LOOP;

  -- W-5 zero-legacy-survivors check: any policy on a travel_% table whose name
  -- doesn't match the new convention is a survivor — should be impossible after
  -- the DROP DO block, but assert it explicitly.
  SELECT COUNT(*) INTO legacy_count
    FROM pg_policy
   WHERE polrelid IN (
     SELECT oid FROM pg_class
      WHERE relname LIKE 'travel_%'
        AND relnamespace = 'public'::regnamespace
   )
     AND polname NOT LIKE 'travel\_%\_select%' ESCAPE '\'
     AND polname NOT LIKE 'travel\_%\_insert%' ESCAPE '\'
     AND polname NOT LIKE 'travel\_%\_update%' ESCAPE '\'
     AND polname NOT LIKE 'travel\_%\_delete%' ESCAPE '\';
  IF legacy_count <> 0 THEN
    RAISE EXCEPTION 'travel_* RLS rewrite: % legacy policies survived (expected 0). Check the DROP DO block.', legacy_count;
  END IF;

  RAISE NOTICE 'travel_* RLS rewrite self-check passed: 4 trust-kernel policies per table, 0 legacy survivors';
END $$;

COMMIT;

-- ============================================================================
-- Rollback (commented; recreate legacy policies if revert needed):
-- ----------------------------------------------------------------------------
--   BEGIN;
--   -- For each travel_* table, drop the new policies and recreate the legacy ones.
--   -- Legacy bodies are preserved in supabase/migrations/20260131123615_*.sql; copy
--   -- the CREATE POLICY blocks from there. The DO-block above can be inverted:
--   --   DROP POLICY <table>_select / _insert / _update / _delete; then CREATE
--   --   "Users can view their own X" / "Users can create their own X" / etc.
--   COMMIT;
-- ============================================================================
