-- Drop existing restrictive policies and recreate as permissive

-- PROFILES TABLE - Fix admin/IT admin SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "IT Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "IT Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_it_admin(auth.uid()));

-- MEMBERSHIPS TABLE - Ensure admin policy works correctly  
DROP POLICY IF EXISTS "Admins and IT can manage all memberships" ON public.memberships;

CREATE POLICY "Admins can view all memberships" 
ON public.memberships 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "IT Admins can view all memberships" 
ON public.memberships 
FOR SELECT 
TO authenticated
USING (public.is_it_admin(auth.uid()));

CREATE POLICY "Admins can manage memberships" 
ON public.memberships 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "IT Admins can manage memberships" 
ON public.memberships 
FOR ALL 
TO authenticated
USING (public.is_it_admin(auth.uid()))
WITH CHECK (public.is_it_admin(auth.uid()));

-- VENDORS TABLE - Ensure admin policy works correctly
DROP POLICY IF EXISTS "Admins and IT can manage all vendors" ON public.vendors;

CREATE POLICY "Admins can view all vendors" 
ON public.vendors 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "IT Admins can view all vendors" 
ON public.vendors 
FOR SELECT 
TO authenticated
USING (public.is_it_admin(auth.uid()));

CREATE POLICY "Admins can manage vendors" 
ON public.vendors 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "IT Admins can manage vendors" 
ON public.vendors 
FOR ALL 
TO authenticated
USING (public.is_it_admin(auth.uid()))
WITH CHECK (public.is_it_admin(auth.uid()));