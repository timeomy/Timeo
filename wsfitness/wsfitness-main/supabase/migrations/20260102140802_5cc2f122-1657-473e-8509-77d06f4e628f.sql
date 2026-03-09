-- Drop the old check constraint and add a new one that includes pending_approval and rejected statuses
ALTER TABLE public.memberships DROP CONSTRAINT memberships_status_check;

ALTER TABLE public.memberships ADD CONSTRAINT memberships_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'pending_approval'::text, 'rejected'::text]));