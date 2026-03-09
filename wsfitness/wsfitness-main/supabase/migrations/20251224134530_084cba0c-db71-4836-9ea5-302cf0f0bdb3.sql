-- Allow authenticated users (who have an invite code) to self-assign the 'coach' role.
-- This does NOT allow anyone to self-assign 'admin'.
DROP POLICY IF EXISTS "Users can self-assign coach role" ON public.user_roles;

CREATE POLICY "Users can self-assign coach role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'coach'::app_role
);

-- (Optional hardening) Ensure no duplicate coach role rows can be inserted
-- Unique(user_id, role) already exists per schema.