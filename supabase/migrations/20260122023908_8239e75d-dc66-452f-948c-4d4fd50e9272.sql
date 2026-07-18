-- Add quick_actions column to profiles table for storing user's selected quick actions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quick_actions text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.quick_actions IS 'Array of quick action IDs selected by the user for the dashboard widget';