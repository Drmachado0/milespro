-- Add new columns to credit_cards table for complete card registration
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS due_day integer,
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'principal',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS schedule_points_on_closing boolean DEFAULT false;