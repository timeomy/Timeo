-- Add member_id column to clients table to link to profiles
-- This allows coach clients to be linked to actual gym members
ALTER TABLE public.clients 
ADD COLUMN member_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_clients_member_id ON public.clients(member_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.clients.member_id IS 'Links PT client to their gym member profile for unified data access';