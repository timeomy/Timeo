-- Add new columns to vouchers table for advanced controls
ALTER TABLE public.vouchers
ADD COLUMN IF NOT EXISTS max_redemptions integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS valid_from timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT NULL;

-- Create index for performance on voucher date checks
CREATE INDEX IF NOT EXISTS idx_vouchers_validity ON public.vouchers (valid_from, expires_at) WHERE status = 'valid';