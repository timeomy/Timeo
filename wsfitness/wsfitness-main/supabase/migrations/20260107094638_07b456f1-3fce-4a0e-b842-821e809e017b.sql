-- Fix the handle_new_member_signup function to enforce pending status
-- and withhold member_id generation until admin approval

CREATE OR REPLACE FUNCTION public.handle_new_member_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the user has a 'member' role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = 'member'
  ) THEN
    -- Check if membership already exists (admin may have created it)
    IF NOT EXISTS (
      SELECT 1 FROM public.memberships WHERE user_id = NEW.user_id
    ) THEN
      -- DO NOT generate member_id yet - leave it NULL until admin approval
      -- DO NOT update profile with member_id here
      
      -- Create a PENDING membership for self-signup members (requires admin approval)
      INSERT INTO public.memberships (user_id, plan_type, status, valid_from)
      VALUES (NEW.user_id, 'Pending Approval', 'pending', NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;