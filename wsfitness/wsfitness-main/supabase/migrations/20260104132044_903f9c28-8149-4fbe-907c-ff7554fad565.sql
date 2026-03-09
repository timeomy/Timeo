-- Add NFC Card ID column to profiles table
ALTER TABLE public.profiles
ADD COLUMN nfc_card_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_nfc_card_id ON public.profiles(nfc_card_id) WHERE nfc_card_id IS NOT NULL;