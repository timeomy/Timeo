-- Fix security definer view by dropping and recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.member_access_view;

CREATE VIEW public.member_access_view 
WITH (security_invoker = true)
AS
SELECT 
  p.member_id AS person_id,
  p.id AS user_id,
  p.name,
  CASE 
    WHEN m.status IS NULL THEN 'no_membership'
    WHEN m.status = 'pending_approval' THEN 'pending'
    WHEN m.status = 'expired' THEN 'expired'
    WHEN m.status = 'suspended' THEN 'suspended'
    WHEN m.status = 'active' AND m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN m.status = 'active' THEN 'active'
    ELSE m.status
  END AS membership_status,
  m.expiry_date::timestamptz AS valid_until,
  m.plan_type
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.member_id IS NOT NULL;