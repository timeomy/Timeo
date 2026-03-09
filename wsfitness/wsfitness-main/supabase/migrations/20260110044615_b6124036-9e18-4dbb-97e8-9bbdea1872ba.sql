-- Drop the existing constraint and add 'vendor' to allowed statuses
ALTER TABLE public.memberships DROP CONSTRAINT memberships_status_check;

ALTER TABLE public.memberships ADD CONSTRAINT memberships_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'pending_approval'::text, 'rejected'::text, 'vendor'::text]));