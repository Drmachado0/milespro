-- Step 2: Update existing subscriptions to map old plans to new plans
-- 'pro' -> 'basic', 'agency' -> 'pro_familia'
UPDATE public.user_subscriptions 
SET plan = 'basic'::subscription_plan 
WHERE plan = 'pro'::subscription_plan;

UPDATE public.user_subscriptions 
SET plan = 'pro_familia'::subscription_plan 
WHERE plan = 'agency'::subscription_plan;

-- Update the handle_new_user function to use new plan names
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  initial_plan subscription_plan;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');
  
  -- Check for initial_plan in metadata, default to 'free'
  initial_plan := COALESCE(
    (NEW.raw_user_meta_data->>'initial_plan')::subscription_plan,
    'free'::subscription_plan
  );
  
  -- Create subscription with appropriate limits based on plan
  INSERT INTO public.user_subscriptions (user_id, plan, max_users, max_operations_per_month, max_programs, history_days)
  VALUES (
    NEW.id, 
    initial_plan,
    CASE 
      WHEN initial_plan = 'pro_familia' THEN 999
      WHEN initial_plan = 'basic' THEN 2
      ELSE 1 
    END,
    CASE 
      WHEN initial_plan IN ('pro_familia', 'basic') THEN NULL
      ELSE 20 
    END,
    CASE 
      WHEN initial_plan = 'pro_familia' THEN NULL
      WHEN initial_plan = 'basic' THEN NULL
      ELSE 5 
    END,
    CASE 
      WHEN initial_plan = 'pro_familia' THEN NULL
      WHEN initial_plan = 'basic' THEN 365
      ELSE 90 
    END
  );
  
  RETURN NEW;
END;
$function$;

-- Update the can_access_feature function for new plan names
CREATE OR REPLACE FUNCTION public.can_access_feature(_user_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan;
BEGIN
  SELECT public.get_user_plan(_user_id) INTO user_plan;
  
  -- Pro Familia features (previously agency)
  IF _feature IN ('agency', 'multi_clients', 'receipts', 'api', 'white_label') THEN
    RETURN user_plan = 'pro_familia';
  END IF;
  
  -- Basic features (previously pro)
  IF _feature IN ('reports', 'simulators', 'unlimited_operations') THEN
    RETURN user_plan IN ('basic', 'pro_familia');
  END IF;
  
  -- Free features
  RETURN true;
END;
$function$;

-- Update the can_create_operation function for new plan names
CREATE OR REPLACE FUNCTION public.can_create_operation(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan;
  max_ops integer;
  current_ops integer;
BEGIN
  SELECT plan, max_operations_per_month
  INTO user_plan, max_ops
  FROM public.user_subscriptions
  WHERE user_id = _user_id AND is_active = true;
  
  -- Unlimited for basic/pro_familia
  IF user_plan IN ('basic', 'pro_familia') THEN
    RETURN true;
  END IF;
  
  -- Check limit for free plan
  IF max_ops IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT public.count_monthly_operations(_user_id) INTO current_ops;
  
  RETURN current_ops < max_ops;
END;
$function$;