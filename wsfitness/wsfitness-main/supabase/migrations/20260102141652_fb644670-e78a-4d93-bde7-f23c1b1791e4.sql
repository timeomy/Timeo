-- Add email change tracking column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_change_count integer NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_change_count IS 'Tracks how many times the user has changed their email. Limited to 3 changes.';