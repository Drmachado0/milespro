-- Add onboarding progress column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_progress jsonb 
DEFAULT '{"completed": [], "dismissed": false, "started_at": null}'::jsonb;