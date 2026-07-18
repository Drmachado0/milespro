-- Add VIP quota columns to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS vip_quota_monthly integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_quota_annual integer,
ADD COLUMN IF NOT EXISTS vip_active boolean DEFAULT true;

-- Create vip_entries table for tracking VIP lounge access
CREATE TABLE public.vip_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('titular', 'dependente')),
  location text NOT NULL,
  access_date timestamp with time zone NOT NULL DEFAULT now(),
  override boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_vip_entries_card_id ON public.vip_entries(card_id);
CREATE INDEX idx_vip_entries_access_date ON public.vip_entries(access_date);
CREATE INDEX idx_vip_entries_location ON public.vip_entries(location);
CREATE INDEX idx_vip_entries_user_id ON public.vip_entries(user_id);

-- Enable RLS
ALTER TABLE public.vip_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vip_entries
CREATE POLICY "Users can view their own VIP entries"
ON public.vip_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own VIP entries"
ON public.vip_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VIP entries"
ON public.vip_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own VIP entries"
ON public.vip_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_vip_entries_updated_at
BEFORE UPDATE ON public.vip_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();