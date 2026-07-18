-- Create travel_cruises table
CREATE TABLE public.travel_cruises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  cruise_line TEXT NOT NULL,
  ship_name TEXT NOT NULL,
  cabin_type TEXT NOT NULL,
  departure_port TEXT NOT NULL,
  arrival_port TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,
  passengers INTEGER NOT NULL DEFAULT 1,
  miles_used INTEGER NOT NULL DEFAULT 0,
  miles_program TEXT,
  tax_brl NUMERIC NOT NULL DEFAULT 0,
  total_cost_brl NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create travel_insurances table
CREATE TABLE public.travel_insurances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  insurance_company TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  coverage_type TEXT NOT NULL DEFAULT 'internacional',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  travelers INTEGER NOT NULL DEFAULT 1,
  cost_brl NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  policy_number TEXT,
  coverage_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create travel_attractions table
CREATE TABLE public.travel_attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  attraction_name TEXT NOT NULL,
  attraction_type TEXT NOT NULL DEFAULT 'tour',
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Brasil',
  activity_date DATE NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1,
  cost_brl NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_number TEXT,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create travel_transfers table
CREATE TABLE public.travel_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL DEFAULT 'aeroporto',
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  transfer_date DATE NOT NULL,
  transfer_time TIME,
  passengers INTEGER NOT NULL DEFAULT 1,
  vehicle_type TEXT NOT NULL DEFAULT 'sedan',
  cost_brl NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_number TEXT,
  provider TEXT,
  flight_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.travel_cruises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_cruises
CREATE POLICY "Users can view their own cruises" ON public.travel_cruises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cruises" ON public.travel_cruises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cruises" ON public.travel_cruises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cruises" ON public.travel_cruises FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for travel_insurances
CREATE POLICY "Users can view their own insurances" ON public.travel_insurances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own insurances" ON public.travel_insurances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own insurances" ON public.travel_insurances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own insurances" ON public.travel_insurances FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for travel_attractions
CREATE POLICY "Users can view their own attractions" ON public.travel_attractions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attractions" ON public.travel_attractions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attractions" ON public.travel_attractions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attractions" ON public.travel_attractions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for travel_transfers
CREATE POLICY "Users can view their own transfers" ON public.travel_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transfers" ON public.travel_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transfers" ON public.travel_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transfers" ON public.travel_transfers FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_travel_cruises_updated_at BEFORE UPDATE ON public.travel_cruises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_insurances_updated_at BEFORE UPDATE ON public.travel_insurances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_attractions_updated_at BEFORE UPDATE ON public.travel_attractions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_transfers_updated_at BEFORE UPDATE ON public.travel_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();