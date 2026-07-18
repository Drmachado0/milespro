-- Add sale_price to hotel reservations
ALTER TABLE public.travel_hotel_reservations 
ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0;

-- Add sale_price and miles_program to car rentals
ALTER TABLE public.travel_car_rentals 
ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0;

ALTER TABLE public.travel_car_rentals 
ADD COLUMN IF NOT EXISTS miles_program text;