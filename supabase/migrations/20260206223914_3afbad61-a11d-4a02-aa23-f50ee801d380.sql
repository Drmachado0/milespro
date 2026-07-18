-- Step 1: Add new enum values only
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pro_familia';

-- Add new columns to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS max_programs integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS history_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT NULL;