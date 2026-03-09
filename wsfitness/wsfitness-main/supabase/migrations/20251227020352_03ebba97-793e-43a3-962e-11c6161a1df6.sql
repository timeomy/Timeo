-- Create memberships table for member status tracking
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  expiry_date DATE,
  plan_type TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create vendors table for vendor business info
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  total_redeemed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create vouchers table for perks/discounts
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'redeemed', 'expired')),
  value NUMERIC NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT voucher_code_length CHECK (char_length(code) >= 6)
);

-- Add phone_number and avatar_url to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Memberships RLS policies
CREATE POLICY "Users can view their own membership"
ON public.memberships FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins and IT can manage all memberships"
ON public.memberships FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Vendors RLS policies
CREATE POLICY "Vendors can view their own vendor profile"
ON public.vendors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Anyone can view vendor list"
ON public.vendors FOR SELECT
USING (true);

CREATE POLICY "Admins and IT can manage all vendors"
ON public.vendors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Vouchers RLS policies
CREATE POLICY "Members can view available vouchers"
ON public.vouchers FOR SELECT
USING (member_id = auth.uid() OR member_id IS NULL);

CREATE POLICY "Vendors can view vouchers for their business"
ON public.vouchers FOR SELECT
USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update voucher status"
ON public.vouchers FOR UPDATE
USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Admins and IT can manage all vouchers"
ON public.vouchers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Function to check if user has member role
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'member'
  )
$$;

-- Function to check if user has vendor role
CREATE OR REPLACE FUNCTION public.is_vendor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'vendor'
  )
$$;

-- Trigger to update updated_at on memberships
CREATE TRIGGER update_memberships_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on vendors
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();