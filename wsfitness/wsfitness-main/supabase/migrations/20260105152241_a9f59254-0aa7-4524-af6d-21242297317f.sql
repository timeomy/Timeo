-- Add gym hours configuration to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS gym_opening_hour integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS gym_closing_hour integer DEFAULT 23,
ADD COLUMN IF NOT EXISTS staff_early_minutes integer DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN public.company_settings.gym_opening_hour IS 'Gym opening hour in 24h format (0-23)';
COMMENT ON COLUMN public.company_settings.gym_closing_hour IS 'Gym closing hour in 24h format (0-23)';
COMMENT ON COLUMN public.company_settings.staff_early_minutes IS 'Minutes before opening that staff can check in';