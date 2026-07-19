-- 1. Remove the overly permissive milhas SELECT policy
DROP POLICY IF EXISTS "Anyone can view milhas files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to milhas" ON storage.objects;

-- 2. Lock down user_roles: deny INSERT/UPDATE/DELETE to authenticated users.
-- Only service_role (which bypasses RLS) can write.
CREATE POLICY "No client-side role inserts"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client-side role updates"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client-side role deletes"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- 3. Realtime authorization: scope channel topics to the user's own id.
-- Topic convention: "user:<auth.uid()>"
-- Guarded (portability): realtime.messages only exists once Realtime is
-- provisioned. On a fresh Supabase project it may be absent — skip the
-- authorization RLS instead of failing the migration. It can be (re)applied
-- once Realtime is enabled. Idempotent via DROP POLICY IF EXISTS.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can subscribe to their own channel" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can broadcast to their own channel" ON realtime.messages';
    EXECUTE $pol$
      CREATE POLICY "Users can subscribe to their own channel"
      ON realtime.messages FOR SELECT TO authenticated
      USING (realtime.topic() = ('user:' || auth.uid()::text))
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Users can broadcast to their own channel"
      ON realtime.messages FOR INSERT TO authenticated
      WITH CHECK (realtime.topic() = ('user:' || auth.uid()::text))
    $pol$;
  ELSE
    RAISE NOTICE 'realtime.messages not present on this project — skipping realtime authorization RLS';
  END IF;
END $$;
