-- CI/local parity: the service_role client is the backend writer for
-- subscription state and test fixtures. Make that table privilege explicit so
-- RLS bypass is not blocked by plain SQL permissions in fresh local resets.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_subscriptions TO service_role;

DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.user_subscriptions', 'INSERT') THEN
    RAISE EXCEPTION 'service_role missing INSERT on public.user_subscriptions';
  END IF;

  RAISE NOTICE 'service_role grants confirmed on public.user_subscriptions';
END $$;
