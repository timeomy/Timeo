-- Add notes column to payment_requests for customer remarks
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS notes text;