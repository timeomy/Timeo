-- Add member_id and qr_code_url to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS member_id text UNIQUE,
ADD COLUMN IF NOT EXISTS qr_code_url text;

-- Create index for member_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_member_id ON public.profiles(member_id);

-- Create a sequence counter for generating readable member IDs
CREATE TABLE IF NOT EXISTS public.member_id_counter (
  id integer PRIMARY KEY DEFAULT 1,
  current_value integer NOT NULL DEFAULT 0,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())
);

-- Insert initial counter if not exists
INSERT INTO public.member_id_counter (id, current_value, year) 
VALUES (1, 0, EXTRACT(YEAR FROM now())::integer)
ON CONFLICT (id) DO NOTHING;

-- RLS for counter (only admins can read/update)
ALTER TABLE public.member_id_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage member_id_counter" 
ON public.member_id_counter 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Function to generate next member ID
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year integer;
  counter_year integer;
  next_val integer;
  member_id text;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::integer;
  
  -- Get current counter state
  SELECT year, current_value INTO counter_year, next_val
  FROM public.member_id_counter
  WHERE id = 1
  FOR UPDATE;
  
  -- Reset counter if year changed
  IF counter_year IS NULL OR counter_year < current_year THEN
    next_val := 1;
    UPDATE public.member_id_counter 
    SET current_value = 1, year = current_year 
    WHERE id = 1;
    
    IF NOT FOUND THEN
      INSERT INTO public.member_id_counter (id, current_value, year)
      VALUES (1, 1, current_year);
    END IF;
  ELSE
    next_val := next_val + 1;
    UPDATE public.member_id_counter 
    SET current_value = next_val 
    WHERE id = 1;
  END IF;
  
  -- Format: WS-2025-0001
  member_id := 'WS-' || current_year::text || '-' || LPAD(next_val::text, 4, '0');
  
  RETURN member_id;
END;
$$;