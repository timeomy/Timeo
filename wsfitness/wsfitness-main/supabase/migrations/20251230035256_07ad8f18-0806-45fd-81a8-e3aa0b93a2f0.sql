CREATE OR REPLACE FUNCTION public.generate_member_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  chars text := '0123456789ABCDEF'; -- Hexadecimal only for gate compatibility
  result text := '';
  i int;
  new_member_id text;
  max_attempts int := 10;
  attempt int := 0;
BEGIN
  LOOP
    -- Generate 8 random hexadecimal characters
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    new_member_id := result; -- No prefix, just 8 hex chars
    
    -- Check for collision with explicit table qualification
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.member_id = new_member_id) THEN
      RETURN new_member_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique member ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$function$;