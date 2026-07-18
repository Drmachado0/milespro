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
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can subscribe to their own channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
);

CREATE POLICY "Users can broadcast to their own channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
);
