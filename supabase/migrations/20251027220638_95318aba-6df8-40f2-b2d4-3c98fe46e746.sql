-- Add gender and location columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS location text;