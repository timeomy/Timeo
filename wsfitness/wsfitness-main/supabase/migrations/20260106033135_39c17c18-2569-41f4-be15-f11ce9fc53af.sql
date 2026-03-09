-- Add indexes for frequently queried columns on profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_nfc_card_id ON public.profiles(nfc_card_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);
CREATE INDEX IF NOT EXISTS idx_profiles_member_id ON public.profiles(member_id);