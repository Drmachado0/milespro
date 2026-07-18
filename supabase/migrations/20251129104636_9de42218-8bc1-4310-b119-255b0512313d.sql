-- Add avatar_url column to holders table for profile photos
ALTER TABLE public.holders ADD COLUMN IF NOT EXISTS avatar_url text;