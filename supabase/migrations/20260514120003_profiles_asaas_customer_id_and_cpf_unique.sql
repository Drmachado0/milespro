-- Phase 2 W2a (Plan 02-05) — HIGH-01 trial abuse defense + Asaas customer cache
--
-- Two changes to public.profiles:
--   1. asaas_customer_id TEXT — denormalized cache of the Asaas customer.id.
--      create-checkout-session writes here on first checkout so subsequent
--      checkouts skip the Asaas GET-or-CREATE round-trip.
--   2. cpf TEXT (created if missing) + partial UNIQUE index — HIGH-01
--      defense. Asaas-side cpfCnpj dedupe is the primary defense; this is
--      belt-and-suspenders at the DB layer to keep the local cache honest
--      even if someone manages to bypass the Asaas customer create path.
--
-- profiles.cpf does NOT exist in production today (verified via grep over
-- supabase/migrations/* — only holders.cpf and travel_clients.cpf exist).
-- So we ADD COLUMN here first; downstream code (create-checkout-session
-- Task 5) writes it the first time a user fills CPF in the checkout flow.

-- 1. Asaas customer id cache
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

CREATE INDEX IF NOT EXISTS profiles_asaas_customer_idx
  ON public.profiles (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- 2. CPF column — may not exist yet. Idempotent ADD COLUMN.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 3. Duplicate guard BEFORE adding UNIQUE. Fails the migration loudly if
--    existing data already has duplicates (Asaas+local need a single
--    canonical CPF per profile). If this raises in production, dedupe is
--    a separate operator workstream (out of scope for this plan).
DO $$
DECLARE
  duplicates BIGINT;
BEGIN
  SELECT COUNT(*) INTO duplicates
  FROM (
    SELECT cpf
    FROM public.profiles
    WHERE cpf IS NOT NULL
    GROUP BY cpf
    HAVING COUNT(*) > 1
  ) d;

  IF duplicates > 0 THEN
    RAISE EXCEPTION
      'profiles.cpf has % duplicate values — dedupe before applying UNIQUE constraint',
      duplicates;
  END IF;
END $$;

-- 4. Partial UNIQUE index on cpf. Postgres treats NULLs as distinct for
--    UNIQUE constraints, but partial index is more explicit about intent
--    (skips NULL rows entirely) and yields a smaller index when many
--    profiles have not filled CPF yet.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL;

-- 5. Self-checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'asaas_customer_id'
  ) THEN
    RAISE EXCEPTION 'asaas_customer_id not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'cpf'
  ) THEN
    RAISE EXCEPTION 'cpf column not added to profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND indexname = 'profiles_cpf_unique'
  ) THEN
    RAISE EXCEPTION 'profiles_cpf_unique not created';
  END IF;
END $$;
