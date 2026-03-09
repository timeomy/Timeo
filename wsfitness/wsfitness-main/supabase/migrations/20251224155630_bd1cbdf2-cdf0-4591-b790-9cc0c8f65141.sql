ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);