-- Add new columns to travel_tickets for enhanced ticket issuance
ALTER TABLE public.travel_tickets
ADD COLUMN one_way boolean DEFAULT false,
ADD COLUMN baggage_cost numeric DEFAULT 0,
ADD COLUMN extra_services_cost numeric DEFAULT 0,
ADD COLUMN miles_program text,
ADD COLUMN third_party_miles boolean DEFAULT false,
ADD COLUMN third_party_cost numeric DEFAULT 0;