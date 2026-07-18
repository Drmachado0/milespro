-- Create promotions table for miles promotions alerts
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'promo' CHECK (type IN ('warning', 'promo', 'income', 'bonus')),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  source TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (promotions are public)
CREATE POLICY "Promotions are viewable by everyone" 
ON public.promotions 
FOR SELECT 
USING (is_active = true);

-- Enable realtime for promotions
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;