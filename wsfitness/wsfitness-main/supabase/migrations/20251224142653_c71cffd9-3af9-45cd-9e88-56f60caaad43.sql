-- Fix INPUT_VALIDATION: Add server-side validation constraints

-- Phone format validation (allows +, digits, dashes, spaces)
ALTER TABLE public.clients 
ADD CONSTRAINT clients_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+?[0-9\-\s]+$');

-- Non-negative sessions validation
ALTER TABLE public.clients 
ADD CONSTRAINT clients_sessions_non_negative 
CHECK (total_sessions_purchased >= 0 AND carry_over_sessions >= 0);

-- Fix INFO_LEAKAGE: Remove public SELECT policy that exposes invite codes
-- The use_invite_code() RPC function already handles validation securely
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.invite_codes;