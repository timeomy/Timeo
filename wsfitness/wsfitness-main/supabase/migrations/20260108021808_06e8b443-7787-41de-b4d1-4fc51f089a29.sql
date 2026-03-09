-- Add split shift columns for gym operating hours (stored as time strings for 30-min precision)
-- Session 1: Morning shift (e.g., 07:30 - 12:00)
-- Session 2: Afternoon shift (e.g., 14:00 - 22:00)

ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS session1_start TEXT DEFAULT '07:30',
ADD COLUMN IF NOT EXISTS session1_end TEXT DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS session2_start TEXT DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS session2_end TEXT DEFAULT '22:00';

-- Add comments for documentation
COMMENT ON COLUMN public.company_settings.session1_start IS 'Morning session start time (HH:MM format)';
COMMENT ON COLUMN public.company_settings.session1_end IS 'Morning session end time (HH:MM format)';
COMMENT ON COLUMN public.company_settings.session2_start IS 'Afternoon session start time (HH:MM format)';
COMMENT ON COLUMN public.company_settings.session2_end IS 'Afternoon session end time (HH:MM format)';