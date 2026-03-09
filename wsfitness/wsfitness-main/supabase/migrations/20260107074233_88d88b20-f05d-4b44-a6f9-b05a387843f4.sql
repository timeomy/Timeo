-- Fix: Update handle_new_member_signup to set status 'active' instead of 'pending_approval'
-- This allows new signups to login immediately without admin approval

CREATE OR REPLACE FUNCTION public.handle_new_member_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
      -- Generate member_id for the profile
      UPDATE public.profiles 
      SET member_id = public.generate_member_id()
      WHERE id = NEW.user_id AND member_id IS NULL;
      
      -- Create an ACTIVE membership for self-signup members (no approval needed)
      INSERT INTO public.memberships (user_id, plan_type, status, valid_from)
      VALUES (NEW.user_id, 'Pending Payment', 'active', CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;