-- Add valid_from column to memberships table for tracking membership start date
ALTER TABLE public.memberships 
ADD COLUMN IF NOT EXISTS valid_from date DEFAULT CURRENT_DATE;

-- Add comment for clarity
COMMENT ON COLUMN public.memberships.valid_from IS 'Membership start date';
COMMENT ON COLUMN public.memberships.expiry_date IS 'Membership end date (valid_until)';