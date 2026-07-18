-- Add modality type and initial bonus columns to club_subscriptions
ALTER TABLE public.club_subscriptions 
ADD COLUMN IF NOT EXISTS modality text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS initial_bonus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS annual_installment_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS initial_bonus_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_bonus_applied_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.club_subscriptions.modality IS 'monthly, annual_installments, annual_upfront';
COMMENT ON COLUMN public.club_subscriptions.initial_bonus IS 'Fixed bonus points applied only in the 1st month';
COMMENT ON COLUMN public.club_subscriptions.annual_price IS 'Annual upfront price';
COMMENT ON COLUMN public.club_subscriptions.annual_installment_price IS 'Annual installment total price (12x)';
COMMENT ON COLUMN public.club_subscriptions.initial_bonus_applied IS 'Whether initial bonus was already credited';
COMMENT ON COLUMN public.club_subscriptions.initial_bonus_applied_at IS 'When initial bonus was applied';