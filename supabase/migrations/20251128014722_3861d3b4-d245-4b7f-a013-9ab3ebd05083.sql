-- Add miles_per_dollar column to credit_cards table for organic miles calculation
ALTER TABLE public.credit_cards 
ADD COLUMN miles_per_dollar numeric DEFAULT 1.0,
ADD COLUMN linked_program text DEFAULT NULL;