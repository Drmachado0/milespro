
-- Create travel_clients table for client registration
CREATE TABLE public.travel_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  miles_balance INTEGER NOT NULL DEFAULT 0,
  total_miles_used INTEGER NOT NULL DEFAULT 0,
  total_spent_brl NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_tickets table for ticket issuance
CREATE TABLE public.travel_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  airline TEXT NOT NULL,
  flight_date DATE NOT NULL,
  return_date DATE,
  passengers INTEGER NOT NULL DEFAULT 1,
  miles_used INTEGER NOT NULL,
  tax_brl NUMERIC NOT NULL DEFAULT 0,
  total_cost_brl NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  locator TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_hotel_reservations table
CREATE TABLE public.travel_hotel_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  city TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  miles_used INTEGER NOT NULL,
  tax_brl NUMERIC NOT NULL DEFAULT 0,
  total_cost_brl NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  confirmation_number TEXT,
  hotel_program TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_car_rentals table
CREATE TABLE public.travel_car_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  rental_company TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  dropoff_date DATE NOT NULL,
  days INTEGER NOT NULL,
  vehicle_category TEXT NOT NULL,
  miles_used INTEGER NOT NULL,
  tax_brl NUMERIC NOT NULL DEFAULT 0,
  total_cost_brl NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  confirmation_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.travel_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_hotel_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_car_rentals ENABLE ROW LEVEL SECURITY;

-- RLS policies for travel_clients
CREATE POLICY "Users can view their own travel clients" ON public.travel_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own travel clients" ON public.travel_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own travel clients" ON public.travel_clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own travel clients" ON public.travel_clients FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for travel_tickets
CREATE POLICY "Users can view their own travel tickets" ON public.travel_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own travel tickets" ON public.travel_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own travel tickets" ON public.travel_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own travel tickets" ON public.travel_tickets FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for travel_hotel_reservations
CREATE POLICY "Users can view their own hotel reservations" ON public.travel_hotel_reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own hotel reservations" ON public.travel_hotel_reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own hotel reservations" ON public.travel_hotel_reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own hotel reservations" ON public.travel_hotel_reservations FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for travel_car_rentals
CREATE POLICY "Users can view their own car rentals" ON public.travel_car_rentals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own car rentals" ON public.travel_car_rentals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own car rentals" ON public.travel_car_rentals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own car rentals" ON public.travel_car_rentals FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_travel_clients_updated_at BEFORE UPDATE ON public.travel_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_tickets_updated_at BEFORE UPDATE ON public.travel_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_hotel_reservations_updated_at BEFORE UPDATE ON public.travel_hotel_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_car_rentals_updated_at BEFORE UPDATE ON public.travel_car_rentals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for CPF search
CREATE INDEX idx_travel_clients_cpf ON public.travel_clients(cpf);
CREATE INDEX idx_travel_clients_user_id ON public.travel_clients(user_id);
CREATE INDEX idx_travel_tickets_client_id ON public.travel_tickets(client_id);
CREATE INDEX idx_travel_hotel_reservations_client_id ON public.travel_hotel_reservations(client_id);
CREATE INDEX idx_travel_car_rentals_client_id ON public.travel_car_rentals(client_id);
