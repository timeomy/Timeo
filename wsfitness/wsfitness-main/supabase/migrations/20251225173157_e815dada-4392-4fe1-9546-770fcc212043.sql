-- Drop the old restrictive view policy for admins
DROP POLICY IF EXISTS "Admins can view non-IT roles" ON public.user_roles;

-- Create new policy allowing admins to view ALL roles (including it_admin)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the existing policy that only allows admins to MANAGE non-IT roles
-- "Admins can manage non-IT roles" already exists and restricts INSERT/UPDATE/DELETE