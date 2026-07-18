-- Add holder_id and holder_name columns to travel_hotel_reservations
ALTER TABLE travel_hotel_reservations 
ADD COLUMN IF NOT EXISTS holder_id UUID REFERENCES holders(id),
ADD COLUMN IF NOT EXISTS holder_name TEXT;

-- Make client_id nullable for backward compatibility
ALTER TABLE travel_hotel_reservations 
ALTER COLUMN client_id DROP NOT NULL;