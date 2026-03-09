-- Update generate_member_id function to use high-entropy random alphanumeric strings
-- Format: WS-[RANDOM_8_CHARS] using uppercase A-Z and 0-9, excluding ambiguous chars (0, O, 1, I)
CREATE OR REPLACE FUNCTION public.generate_member_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes 0, O, 1, I
  result text := '';
  i int;
  member_id text;
  max_attempts int := 10;
  attempt int := 0;
BEGIN
  LOOP
    -- Generate 8 random characters
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    member_id := 'WS-' || result;
    
    -- Check for collision
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.member_id = member_id) THEN
      RETURN member_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique member ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;