-- Add mileage-related columns to travel_transfers table
-- Following the same structure as travel_tickets

ALTER TABLE public.travel_transfers
ADD COLUMN IF NOT EXISTS miles_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS miles_program text,
ADD COLUMN IF NOT EXISTS third_party_miles boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS third_party_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_brl numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_brl numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS locator text;

-- Add comment for clarity
COMMENT ON COLUMN public.travel_transfers.miles_used IS 'Quantity of miles used for this transfer';
COMMENT ON COLUMN public.travel_transfers.miles_program IS 'Mileage program used (Livelo, Latam, etc)';
COMMENT ON COLUMN public.travel_transfers.third_party_miles IS 'Whether miles were purchased from third party';
COMMENT ON COLUMN public.travel_transfers.third_party_cost IS 'Cost paid for third-party miles';
COMMENT ON COLUMN public.travel_transfers.tax_brl IS 'Service/boarding tax in BRL';
COMMENT ON COLUMN public.travel_transfers.total_cost_brl IS 'Total calculated cost in BRL';
COMMENT ON COLUMN public.travel_transfers.locator IS 'Confirmation/locator code';