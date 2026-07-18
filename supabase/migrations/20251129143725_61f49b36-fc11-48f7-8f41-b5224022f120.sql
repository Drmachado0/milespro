-- Add miles_program column to travel_hotel_reservations table
ALTER TABLE public.travel_hotel_reservations 
ADD COLUMN miles_program text;

-- Add comment for clarity
COMMENT ON COLUMN public.travel_hotel_reservations.miles_program IS 'The loyalty program used to redeem miles for this hotel reservation';