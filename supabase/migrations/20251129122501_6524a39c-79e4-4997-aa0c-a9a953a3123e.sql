-- Create subscription_history table to track monthly points and bonuses
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.club_subscriptions(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  points_generated INTEGER NOT NULL DEFAULT 0,
  bonus_generated INTEGER NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  cost_per_thousand NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscription history" 
ON public.subscription_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription history" 
ON public.subscription_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription history" 
ON public.subscription_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription history" 
ON public.subscription_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique index to prevent duplicate entries for same subscription/month
CREATE UNIQUE INDEX idx_subscription_history_unique 
ON public.subscription_history(subscription_id, month_year);

-- Create index for faster queries
CREATE INDEX idx_subscription_history_user 
ON public.subscription_history(user_id, month_year);

CREATE INDEX idx_subscription_history_subscription 
ON public.subscription_history(subscription_id, month_year DESC);