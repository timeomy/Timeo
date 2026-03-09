-- Add address field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT;