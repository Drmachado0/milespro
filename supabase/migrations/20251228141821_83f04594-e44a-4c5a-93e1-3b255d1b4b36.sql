-- Update handle_new_user function to create accounts with Agency plan by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');
  
  -- Create AGENCY subscription (for testing all features)
  INSERT INTO public.user_subscriptions (user_id, plan, max_users, max_operations_per_month)
  VALUES (NEW.id, 'agency', 999, NULL);
  
  RETURN NEW;
END;
$$;

-- Migrate all existing accounts to Agency plan
UPDATE public.user_subscriptions
SET 
  plan = 'agency',
  max_users = 999,
  max_operations_per_month = NULL,
  updated_at = now()
WHERE is_active = true;