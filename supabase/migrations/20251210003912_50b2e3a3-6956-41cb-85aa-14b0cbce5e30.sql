-- Fix the security definer view issue by recreating the view without security definer
-- The latest_market_prices view should use the caller's permissions, not the definer's
DROP VIEW IF EXISTS public.latest_market_prices;

CREATE VIEW public.latest_market_prices AS
SELECT DISTINCT ON (program) 
    id,
    program,
    buy_price,
    sell_price,
    source,
    fetched_at
FROM public.program_market_prices
ORDER BY program, fetched_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.latest_market_prices TO anon, authenticated;