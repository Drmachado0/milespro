-- ============================================================================
-- 20260516140000 — user_promo_alerts idempotency (UNIQUE user_id + promo_id)
--
-- Follow-up to 20260515120003_user_promo_alerts.sql, which deliberately
-- shipped without UNIQUE and noted: "If duplicates show up in the field,
-- add UNIQUE in a follow-up migration." This is that follow-up — it lets
-- compute-personalized-promos use ON CONFLICT (user_id, promo_id) DO UPDATE
-- so nightly re-runs refresh balance_in_from / bonus_pct / ends_at instead
-- of inserting new rows.
--
-- Strategy:
--   1. Dedupe pre-existing rows (keep the most recent per (user_id, promo_id);
--      prefer rows where dismissed_at IS NULL to preserve active alerts).
--   2. Add the UNIQUE constraint.
--
-- Reverse:
--   ALTER TABLE public.user_promo_alerts
--     DROP CONSTRAINT IF EXISTS user_promo_alerts_user_promo_unique;
-- ============================================================================

BEGIN;

-- 1. Dedupe — keep one row per (user_id, promo_id). Ranking:
--    a) active (dismissed_at IS NULL) before dismissed
--    b) newest created_at first
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, promo_id
      ORDER BY
        (dismissed_at IS NULL) DESC,
        created_at DESC
    ) AS rn
  FROM public.user_promo_alerts
)
DELETE FROM public.user_promo_alerts
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. UNIQUE constraint — enables ON CONFLICT (user_id, promo_id).
ALTER TABLE public.user_promo_alerts
  ADD CONSTRAINT user_promo_alerts_user_promo_unique
  UNIQUE (user_id, promo_id);

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_promo_alerts_user_promo_unique'
      AND conrelid = 'public.user_promo_alerts'::regclass
  ) THEN
    RAISE EXCEPTION 'idempotency self-check failed: UNIQUE constraint not created';
  END IF;
  RAISE NOTICE 'idempotency self-check passed: UNIQUE (user_id, promo_id) in place';
END $$;

COMMIT;
