-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert market prices" ON public.program_market_prices;

-- Create a more restrictive INSERT policy that only allows admin users
CREATE POLICY "Only admins can insert market prices" 
ON public.program_market_prices 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));