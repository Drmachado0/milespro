-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'agency');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  max_users integer NOT NULL DEFAULT 1,
  max_operations_per_month integer DEFAULT 20, -- NULL = unlimited
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone, -- NULL = no expiration
  is_active boolean NOT NULL DEFAULT true,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Only backend can update subscriptions (no direct user update)

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to also create subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');
  
  -- Create free subscription
  INSERT INTO public.user_subscriptions (user_id, plan, max_users, max_operations_per_month)
  VALUES (NEW.id, 'free', 1, 20);
  
  RETURN NEW;
END;
$$;

-- Create function to get user's plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions 
     WHERE user_id = _user_id 
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
    ),
    'free'::subscription_plan
  )
$$;

-- Create function to check if user can access a feature
CREATE OR REPLACE FUNCTION public.can_access_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  SELECT public.get_user_plan(_user_id) INTO user_plan;
  
  -- Agency features
  IF _feature IN ('agency', 'multi_clients', 'receipts', 'api', 'white_label') THEN
    RETURN user_plan = 'agency';
  END IF;
  
  -- Pro features
  IF _feature IN ('reports', 'simulators', 'unlimited_operations') THEN
    RETURN user_plan IN ('pro', 'agency');
  END IF;
  
  -- Free features
  RETURN true;
END;
$$;

-- Create function to count monthly operations
CREATE OR REPLACE FUNCTION public.count_monthly_operations(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.operations
  WHERE user_id = _user_id
  AND date_trunc('month', created_at) = date_trunc('month', now())
$$;

-- Create function to check if user can create operation
CREATE OR REPLACE FUNCTION public.can_create_operation(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
  max_ops integer;
  current_ops integer;
BEGIN
  SELECT plan, max_operations_per_month
  INTO user_plan, max_ops
  FROM public.user_subscriptions
  WHERE user_id = _user_id AND is_active = true;
  
  -- Unlimited for pro/agency
  IF user_plan IN ('pro', 'agency') THEN
    RETURN true;
  END IF;
  
  -- Check limit for free plan
  IF max_ops IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT public.count_monthly_operations(_user_id) INTO current_ops;
  
  RETURN current_ops < max_ops;
END;
$$;

-- Create subscriptions for existing users who don't have one
INSERT INTO public.user_subscriptions (user_id, plan, max_users, max_operations_per_month)
SELECT id, 'free', 1, 20
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions);