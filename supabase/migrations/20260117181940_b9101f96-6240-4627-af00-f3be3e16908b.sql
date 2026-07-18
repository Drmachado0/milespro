-- Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- No INSERT policy needed for regular users - only service role (via edge functions) can insert
-- The log_audit_event function uses SECURITY DEFINER so it can insert without RLS