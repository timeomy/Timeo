-- Create a function to handle new member signups and create pending membership
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
      -- Create a pending membership for self-signup members
      INSERT INTO public.memberships (user_id, plan_type, status, valid_from)
      VALUES (NEW.user_id, 'Pending', 'pending_approval', CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-create pending membership when member role is assigned
DROP TRIGGER IF EXISTS on_member_role_assigned ON public.user_roles;
CREATE TRIGGER on_member_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'member')
  EXECUTE FUNCTION public.handle_new_member_signup();