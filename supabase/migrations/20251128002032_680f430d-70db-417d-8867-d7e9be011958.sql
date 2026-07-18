-- Add issuer_bank column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN issuer_bank text;