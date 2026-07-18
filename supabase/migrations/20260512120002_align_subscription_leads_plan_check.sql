-- ============================================================================
-- Migration: align subscription_leads.plan_interest CHECK to canonical 3-tier enum
-- Phase: 01-security-foundation-hardening / Plan 02 / Wave 1
-- Requirement: SEC-05 (companion to 20260512120001)
-- ----------------------------------------------------------------------------
-- Forward: ('free', 'plus', 'pro') -> ('free', 'pro', 'vip')
--          (matches the TS SubscriptionLeadPlan in src/lib/subscriptionLeads.ts
--           which Plan 02 Task 3 §3.2 changes to 'free' | 'pro' | 'vip')
--
-- Rationale: The original CHECK constraint accepted 'free', 'plus', 'pro' (where
-- 'plus' was the legacy TS name for what is now 'pro' per CONTEXT D-01). After
-- the TypeScript canonicalization in Plan 02 Task 3, any landing-page lead INSERT
-- with the new 'vip' value would FAIL the CHECK. Existing 'plus' rows are
-- backfilled to 'pro' so they continue to satisfy the new constraint.
--
-- This is a Rule 1 deviation auto-fix discovered during Plan 02 Task 3 (Edit on
-- src/lib/subscriptionLeads.ts:4 surfaced the DB CHECK as a follow-on
-- correctness requirement).
-- ============================================================================

BEGIN;

-- 1. Backfill any legacy 'plus' rows to the new canonical 'pro' value (D-01 mapping).
UPDATE public.subscription_leads
   SET plan_interest = 'pro'
 WHERE plan_interest = 'plus';

-- 2. Drop the old CHECK and add the new one.
ALTER TABLE public.subscription_leads
  DROP CONSTRAINT IF EXISTS subscription_leads_plan_interest_check;

ALTER TABLE public.subscription_leads
  ADD CONSTRAINT subscription_leads_plan_interest_check
  CHECK (plan_interest IN ('free', 'pro', 'vip'));

COMMIT;

-- ============================================================================
-- Rollback:
--   BEGIN;
--   UPDATE public.subscription_leads SET plan_interest = 'plus'
--     WHERE plan_interest = 'pro';  -- (lossy: cannot tell legacy 'plus' from new 'pro')
--   ALTER TABLE public.subscription_leads
--     DROP CONSTRAINT IF EXISTS subscription_leads_plan_interest_check;
--   ALTER TABLE public.subscription_leads
--     ADD CONSTRAINT subscription_leads_plan_interest_check
--     CHECK (plan_interest IN ('free', 'plus', 'pro'));
--   COMMIT;
-- ============================================================================
