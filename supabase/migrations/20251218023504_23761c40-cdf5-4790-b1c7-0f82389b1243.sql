-- Allow authenticated users to insert market prices
CREATE POLICY "Authenticated users can insert market prices"
ON public.program_market_prices
FOR INSERT
TO authenticated
WITH CHECK (true);