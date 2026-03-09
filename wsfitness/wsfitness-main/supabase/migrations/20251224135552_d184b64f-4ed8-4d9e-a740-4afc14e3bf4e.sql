-- Create a helper function to check if user is IT admin
CREATE OR REPLACE FUNCTION public.is_it_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'it_admin'
  )
$$;

-- Update user_roles policies to hide IT admin from regular admins
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- IT admins can do everything
CREATE POLICY "IT Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_it_admin(auth.uid()));

-- Regular admins can only see/manage non-IT admin roles
CREATE POLICY "Admins can view non-IT roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role != 'it_admin'
);

CREATE POLICY "Admins can manage non-IT roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role != 'it_admin'
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role != 'it_admin'
);

-- Update clients policies to include IT admin
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;

CREATE POLICY "Admins and IT can manage all clients"
ON public.clients
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_it_admin(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_it_admin(auth.uid())
);

-- Update training_logs policies to include IT admin
DROP POLICY IF EXISTS "Admins can manage all training logs" ON public.training_logs;

CREATE POLICY "Admins and IT can manage all training logs"
ON public.training_logs
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_it_admin(auth.uid())
);

-- Update profiles policies to include IT admin
CREATE POLICY "IT Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_it_admin(auth.uid()));