-- Allow coaches to insert clients (assigned to themselves)
CREATE POLICY "Coaches can add their own clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (assigned_coach_id = auth.uid());