-- Create table for pending bonuses tracking
CREATE TABLE public.pending_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_id UUID REFERENCES public.operations(id) ON DELETE CASCADE,
  holder_id UUID REFERENCES public.holders(id) ON DELETE SET NULL,
  holder_name TEXT,
  program TEXT NOT NULL DEFAULT 'Livelo',
  quantity INTEGER NOT NULL,
  expected_date DATE NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  produto TEXT,
  loja TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pending_bonuses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own pending bonuses" 
ON public.pending_bonuses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending bonuses" 
ON public.pending_bonuses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending bonuses" 
ON public.pending_bonuses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending bonuses" 
ON public.pending_bonuses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pending_bonuses_updated_at
BEFORE UPDATE ON public.pending_bonuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();