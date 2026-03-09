-- Add waiver consent tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN waiver_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN waiver_signature_name TEXT;