-- Add new columns for bonus tracking and plan details to club_subscriptions
ALTER TABLE public.club_subscriptions
ADD COLUMN IF NOT EXISTS subscription_name text,
ADD COLUMN IF NOT EXISTS bonus_type text DEFAULT 'none', -- 'none', 'percentage', 'fixed_value', 'points'
ADD COLUMN IF NOT EXISTS bonus_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_frequency text DEFAULT 'quarterly', -- 'quarterly', 'monthly', 'yearly'
ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS last_points_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_bonus_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_points_generated integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bonuses_received integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_paid numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.club_subscriptions.bonus_type IS 'Type of quarterly bonus: none, percentage, fixed_value, or points';
COMMENT ON COLUMN public.club_subscriptions.bonus_value IS 'Value of the bonus based on bonus_type';
COMMENT ON COLUMN public.club_subscriptions.bonus_frequency IS 'How often bonus is applied: quarterly, monthly, or yearly';