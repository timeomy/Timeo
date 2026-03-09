-- Fix: grant coaches/studio read access to assigned members' profiles + memberships
-- Approach: drop+recreate policies (idempotent).

DROP POLICY IF EXISTS "Coaches/studio can view assigned member profiles" ON public.profiles;
CREATE POLICY "Coaches/studio can view assigned member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'studio'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.member_id = public.profiles.id
      AND c.assigned_coach_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coaches/studio can view assigned client memberships" ON public.memberships;
CREATE POLICY "Coaches/studio can view assigned client memberships"
ON public.memberships
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'studio'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.member_id = public.memberships.user_id
      AND c.assigned_coach_id = auth.uid()
  )
);