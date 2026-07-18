-- Add flight number and flight time columns to travel_tickets table
ALTER TABLE public.travel_tickets 
ADD COLUMN IF NOT EXISTS flight_number text,
ADD COLUMN IF NOT EXISTS flight_time text;

COMMENT ON COLUMN public.travel_tickets.flight_number IS 'Flight number (e.g., LA3456)';
COMMENT ON COLUMN public.travel_tickets.flight_time IS 'Flight departure time (e.g., 14:30)';