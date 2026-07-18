-- Add columns for miles accumulation model in travel_insurances
ALTER TABLE public.travel_insurances 
ADD COLUMN IF NOT EXISTS miles_earned integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS miles_program text,
ADD COLUMN IF NOT EXISTS points_per_real numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS mile_value_per_thousand numeric DEFAULT 35;