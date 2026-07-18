-- Create travel_receivables table for accounts receivable
CREATE TABLE public.travel_receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_receivables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own receivables"
ON public.travel_receivables
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receivables"
ON public.travel_receivables
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receivables"
ON public.travel_receivables
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receivables"
ON public.travel_receivables
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_travel_receivables_updated_at
BEFORE UPDATE ON public.travel_receivables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();