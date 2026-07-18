-- Add sidebar_order column to profiles table for storing user's preferred category order
ALTER TABLE public.profiles 
ADD COLUMN sidebar_order text[] DEFAULT NULL;