-- Drop existing constraint and add a new one with 'inactive' status
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_status_check;

ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_status_check 
CHECK (status = ANY (ARRAY['valid'::text, 'redeemed'::text, 'expired'::text, 'inactive'::text]));