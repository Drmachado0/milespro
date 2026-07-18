-- Create table for market prices
CREATE TABLE public.program_market_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program TEXT NOT NULL,
  buy_price NUMERIC(10,2) NOT NULL,
  sell_price NUMERIC(10,2) NOT NULL,
  source TEXT DEFAULT 'manual',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_market_prices ENABLE ROW LEVEL SECURITY;

-- Public read access for market prices (all users can see)
CREATE POLICY "Anyone can view market prices" 
ON public.program_market_prices 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_market_prices_program ON public.program_market_prices(program);
CREATE INDEX idx_market_prices_fetched ON public.program_market_prices(fetched_at DESC);

-- Create view for latest prices per program
CREATE OR REPLACE VIEW public.latest_market_prices AS
SELECT DISTINCT ON (program)
  id,
  program,
  buy_price,
  sell_price,
  source,
  fetched_at
FROM public.program_market_prices
ORDER BY program, fetched_at DESC;