-- Adicionar campo para preço em dinheiro (comparação de economia)
ALTER TABLE travel_tickets ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_tickets ADD COLUMN IF NOT EXISTS holder_id uuid REFERENCES holders(id);
ALTER TABLE travel_tickets ADD COLUMN IF NOT EXISTS holder_name text;

-- Tornar client_id opcional para compatibilidade
ALTER TABLE travel_tickets ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar cash_price nas outras tabelas de reservas
ALTER TABLE travel_hotel_reservations ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_car_rentals ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_cruises ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_attractions ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_transfers ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;
ALTER TABLE travel_insurances ADD COLUMN IF NOT EXISTS cash_price numeric DEFAULT 0;