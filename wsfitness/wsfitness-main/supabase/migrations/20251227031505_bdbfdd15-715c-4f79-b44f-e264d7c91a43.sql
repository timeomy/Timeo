-- Drop any existing constraints with these names first (if they exist but are broken)
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS fk_memberships_profiles;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS fk_vendors_profiles;

-- Add foreign key from memberships.user_id to profiles.id
ALTER TABLE public.memberships
ADD CONSTRAINT fk_memberships_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from vendors.user_id to profiles.id  
ALTER TABLE public.vendors
ADD CONSTRAINT fk_vendors_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;