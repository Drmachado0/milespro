export interface TravelClient {
  id: string;
  user_id: string;
  name: string;
  cpf: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  miles_balance: number;
  total_miles_used: number;
  total_spent_brl: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelTicket {
  id: string;
  user_id: string;
  client_id?: string | null; // Optional for backward compatibility
  origin: string;
  destination: string;
  airline: string;
  flight_date: string;
  return_date?: string | null;
  passengers: number;
  miles_used: number;
  tax_brl: number;
  total_cost_brl: number;
  status: string;
  locator?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  one_way?: boolean | null;
  baggage_cost?: number | null;
  extra_services_cost?: number | null;
  miles_program?: string | null;
  third_party_miles?: boolean | null;
  third_party_cost?: number | null;
  sale_price?: number | null;
  flight_number?: string | null;
  flight_time?: string | null;
  // New fields for savings tracking
  cash_price?: number | null;
  holder_id?: string | null;
  holder_name?: string | null;
}

export interface TravelHotelReservation {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  nights: number;
  rooms: number;
  miles_used: number;
  tax_brl: number;
  total_cost_brl: number;
  sale_price: number;
  status: string;
  confirmation_number?: string | null;
  hotel_program?: string | null;
  miles_program?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
}

export interface TravelCarRental {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  rental_company: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  dropoff_date: string;
  days: number;
  vehicle_category: string;
  miles_used: number;
  tax_brl: number;
  total_cost_brl: number;
  sale_price: number;
  miles_program?: string | null;
  status: string;
  confirmation_number?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
}

export interface TravelQuote {
  id: string;
  user_id: string;
  client_id: string;
  quote_number: string;
  quote_type: string;
  status: string;
  valid_until?: string | null;
  description?: string | null;
  miles_program?: string | null;
  miles_estimate: number;
  tax_estimate: number;
  cost_estimate: number;
  sale_price: number;
  origin?: string | null;
  destination?: string | null;
  airline?: string | null;
  flight_date?: string | null;
  return_date?: string | null;
  passengers?: number | null;
  one_way?: boolean | null;
  hotel_name?: string | null;
  city?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  nights?: number | null;
  rooms?: number | null;
  hotel_program?: string | null;
  rental_company?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  pickup_date?: string | null;
  dropoff_date?: string | null;
  days?: number | null;
  vehicle_category?: string | null;
  converted_to_id?: string | null;
  converted_at?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
}

export interface TravelReceivable {
  id: string;
  user_id: string;
  client_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  status: string;
  payment_method?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencySettings {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  cnpj?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelCruise {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  cruise_line: string;
  ship_name: string;
  cabin_type: string;
  departure_port: string;
  arrival_port: string;
  departure_date: string;
  return_date: string;
  nights: number;
  passengers: number;
  miles_used: number;
  miles_program?: string | null;
  tax_brl: number;
  total_cost_brl: number;
  sale_price: number;
  status: string;
  confirmation_number?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
}

export interface TravelInsurance {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  insurance_company: string;
  plan_name: string;
  destination: string;
  coverage_type: string;
  start_date: string;
  end_date: string;
  days: number;
  travelers: number;
  cost_brl: number;
  sale_price: number;
  status: string;
  policy_number?: string | null;
  coverage_amount?: number | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
  // New fields for miles accumulation model
  miles_earned?: number | null;
  miles_program?: string | null;
  points_per_real?: number | null;
  mile_value_per_thousand?: number | null;
}

export interface TravelAttraction {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  attraction_name: string;
  attraction_type: string;
  city: string;
  country: string;
  activity_date: string;
  participants: number;
  cost_brl: number;
  sale_price: number;
  status: string;
  confirmation_number?: string | null;
  provider?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
}

export interface TravelTransfer {
  id: string;
  user_id: string;
  client_id?: string | null; // Deprecated, kept for backward compatibility
  holder_id?: string | null;
  holder_name?: string | null;
  transfer_type: string;
  origin: string;
  destination: string;
  transfer_date: string;
  transfer_time?: string | null;
  passengers: number;
  vehicle_type: string;
  cost_brl: number;
  sale_price: number;
  status: string;
  confirmation_number?: string | null;
  provider?: string | null;
  flight_number?: string | null;
  notes?: string | null;
  created_at: string;
  client?: TravelClient;
  cash_price?: number | null;
  // New mileage fields (same structure as tickets)
  miles_used?: number | null;
  miles_program?: string | null;
  third_party_miles?: boolean | null;
  third_party_cost?: number | null;
  tax_brl?: number | null;
  total_cost_brl?: number | null;
  locator?: string | null;
}
