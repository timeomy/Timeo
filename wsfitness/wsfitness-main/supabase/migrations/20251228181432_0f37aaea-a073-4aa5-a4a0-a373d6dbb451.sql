-- Add UPDATE policy for admins on profiles table
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy for IT admins on profiles table
CREATE POLICY "IT Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_it_admin(auth.uid()))
WITH CHECK (is_it_admin(auth.uid()));