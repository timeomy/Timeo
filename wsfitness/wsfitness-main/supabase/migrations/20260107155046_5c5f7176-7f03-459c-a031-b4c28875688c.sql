-- Add legacy_id column to profiles for tracking imported members
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legacy_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_id ON public.profiles(legacy_id) WHERE legacy_id IS NOT NULL;