-- Drop and recreate the latest_market_prices view with SECURITY INVOKER
-- This fixes the security definer view vulnerability

DROP VIEW IF EXISTS public.latest_market_prices;

CREATE VIEW public.latest_market_prices 
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (program)
    id,
    program,
    buy_price,
    sell_price,
    fetched_at,
    source
FROM public.program_market_prices
ORDER BY program, fetched_at DESC;