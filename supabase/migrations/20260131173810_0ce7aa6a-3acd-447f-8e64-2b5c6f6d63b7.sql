-- Add holder_id and holder_name columns to travel_cruises, travel_insurances, travel_attractions, travel_transfers
-- and make client_id nullable for backward compatibility

-- Cruises
ALTER TABLE public.travel_cruises 
ADD COLUMN IF NOT EXISTS holder_id UUID REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS holder_name TEXT;

ALTER TABLE public.travel_cruises 
ALTER COLUMN client_id DROP NOT NULL;

-- Insurances
ALTER TABLE public.travel_insurances 
ADD COLUMN IF NOT EXISTS holder_id UUID REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS holder_name TEXT;

ALTER TABLE public.travel_insurances 
ALTER COLUMN client_id DROP NOT NULL;

-- Attractions
ALTER TABLE public.travel_attractions 
ADD COLUMN IF NOT EXISTS holder_id UUID REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS holder_name TEXT;

ALTER TABLE public.travel_attractions 
ALTER COLUMN client_id DROP NOT NULL;

-- Transfers
ALTER TABLE public.travel_transfers 
ADD COLUMN IF NOT EXISTS holder_id UUID REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS holder_name TEXT;

ALTER TABLE public.travel_transfers 
ALTER COLUMN client_id DROP NOT NULL;