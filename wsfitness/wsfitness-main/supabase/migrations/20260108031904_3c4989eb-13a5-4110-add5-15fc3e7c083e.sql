-- Add booking_date column to payment_requests for Day Pass scheduling
ALTER TABLE public.payment_requests 
ADD COLUMN booking_date DATE NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.payment_requests.booking_date IS 'Selected visit date for Day Pass purchases';