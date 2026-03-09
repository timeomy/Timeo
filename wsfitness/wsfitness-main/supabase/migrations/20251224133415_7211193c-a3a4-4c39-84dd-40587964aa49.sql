-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can add their own clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can update their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can view their assigned clients" ON public.clients;

-- Create PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can manage all clients"
ON public.clients
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can view their assigned clients"
ON public.clients
FOR SELECT
USING (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can add their own clients"
ON public.clients
FOR INSERT
WITH CHECK (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can update their assigned clients"
ON public.clients
FOR UPDATE
USING (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can delete their assigned clients"
ON public.clients
FOR DELETE
USING (assigned_coach_id = auth.uid());