-- Create travel_quotes table for managing quotes/budgets
CREATE TABLE public.travel_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  quote_type TEXT NOT NULL CHECK (quote_type IN ('ticket', 'hotel', 'car', 'package')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'approved', 'rejected', 'converted', 'expired')),
  valid_until DATE,
  
  -- Common fields
  description TEXT,
  miles_program TEXT,
  miles_estimate INTEGER NOT NULL DEFAULT 0,
  tax_estimate NUMERIC NOT NULL DEFAULT 0,
  cost_estimate NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  
  -- Ticket specific fields (nullable)
  origin TEXT,
  destination TEXT,
  airline TEXT,
  flight_date DATE,
  return_date DATE,
  passengers INTEGER DEFAULT 1,
  one_way BOOLEAN DEFAULT false,
  
  -- Hotel specific fields (nullable)
  hotel_name TEXT,
  city TEXT,
  check_in DATE,
  check_out DATE,
  nights INTEGER DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  hotel_program TEXT,
  
  -- Car specific fields (nullable)
  rental_company TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_date DATE,
  dropoff_date DATE,
  days INTEGER DEFAULT 0,
  vehicle_category TEXT,
  
  -- Conversion tracking
  converted_to_id UUID,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own quotes" 
ON public.travel_quotes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.travel_quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.travel_quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.travel_quotes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_travel_quotes_updated_at
BEFORE UPDATE ON public.travel_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_travel_quotes_user_id ON public.travel_quotes(user_id);
CREATE INDEX idx_travel_quotes_client_id ON public.travel_quotes(client_id);
CREATE INDEX idx_travel_quotes_status ON public.travel_quotes(status);