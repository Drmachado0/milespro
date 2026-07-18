-- Add sidebar_items_order column to profiles table for storing user's preferred item order per category
ALTER TABLE public.profiles 
ADD COLUMN sidebar_items_order jsonb DEFAULT NULL;

-- Example structure: { "nav.management": ["nav.holders", "management.cards", ...], "nav.operations": [...] }