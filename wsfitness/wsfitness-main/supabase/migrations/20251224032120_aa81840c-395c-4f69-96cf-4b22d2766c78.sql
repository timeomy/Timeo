-- Create invite_codes table for signup protection
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invite codes
CREATE POLICY "Admins can manage invite codes"
ON public.invite_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can check if a code is valid (for signup validation)
CREATE POLICY "Anyone can validate invite codes"
ON public.invite_codes
FOR SELECT
TO anon, authenticated
USING (
  is_active = true 
  AND (max_uses IS NULL OR times_used < max_uses)
  AND (expires_at IS NULL OR expires_at > now())
);

-- Create function to validate and use invite code
CREATE OR REPLACE FUNCTION public.use_invite_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO code_record
  FROM invite_codes
  WHERE code = UPPER(TRIM(input_code))
    AND is_active = true
    AND (max_uses IS NULL OR times_used < max_uses)
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE invite_codes
  SET times_used = times_used + 1
  WHERE id = code_record.id;
  
  RETURN true;
END;
$$;

-- Insert a default invite code for testing
INSERT INTO public.invite_codes (code, is_active, max_uses)
VALUES ('WSFITNESS2024', true, NULL);