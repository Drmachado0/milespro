-- Fix REPLICA IDENTITY for realtime to work properly with updates
ALTER TABLE public.promotions REPLICA IDENTITY FULL;