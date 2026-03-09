-- Drop existing restrictive policies on clients
DROP POLICY IF EXISTS "Admins and IT can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can add their own clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can delete their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can update their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Coaches can view their assigned clients" ON public.clients;

-- Create PERMISSIVE policies for clients
CREATE POLICY "Admins and IT can manage all clients"
ON public.clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

CREATE POLICY "Coaches can view their assigned clients"
ON public.clients
FOR SELECT
TO authenticated
USING (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can add their own clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can update their assigned clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (assigned_coach_id = auth.uid());

CREATE POLICY "Coaches can delete their assigned clients"
ON public.clients
FOR DELETE
TO authenticated
USING (assigned_coach_id = auth.uid());

-- Drop existing restrictive policies on training_logs
DROP POLICY IF EXISTS "Admins and IT can manage all training logs" ON public.training_logs;
DROP POLICY IF EXISTS "Coaches can manage their training logs" ON public.training_logs;
DROP POLICY IF EXISTS "Coaches can view logs for their clients" ON public.training_logs;

-- Create PERMISSIVE policies for training_logs
CREATE POLICY "Admins and IT can manage all training logs"
ON public.training_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

CREATE POLICY "Coaches can manage their training logs"
ON public.training_logs
FOR ALL
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can view logs for their clients"
ON public.training_logs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM clients
  WHERE clients.id = training_logs.client_id
  AND clients.assigned_coach_id = auth.uid()
));