-- Add sale_price column to travel_tickets table
ALTER TABLE public.travel_tickets 
ADD COLUMN sale_price numeric NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.travel_tickets.sale_price IS 'Sale price charged to the client for the ticket';