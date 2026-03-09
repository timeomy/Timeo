-- ===========================================
-- Redemption Logs table
-- ===========================================
CREATE TABLE public.redemption_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- who owned the voucher (may be null)
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redemption_logs ENABLE ROW LEVEL SECURITY;

-- Admins / IT can see everything
CREATE POLICY "Admins and IT can manage all redemption_logs"
  ON public.redemption_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Vendor can view their own redemptions (but not member name - front-end joins profiles.member_id only)
CREATE POLICY "Vendors can view their own redemptions"
  ON public.redemption_logs
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- Vendor can insert (when they redeem)
CREATE POLICY "Vendors can insert redemptions"
  ON public.redemption_logs
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- ===========================================
-- Member Vouchers (assigned vouchers)
-- ===========================================
CREATE TABLE public.member_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(member_id, voucher_id)
);

ALTER TABLE public.member_vouchers ENABLE ROW LEVEL SECURITY;

-- Admins / IT can manage
CREATE POLICY "Admins and IT can manage member_vouchers"
  ON public.member_vouchers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Members can view their own assignments
CREATE POLICY "Members can view their own vouchers"
  ON public.member_vouchers
  FOR SELECT
  USING (member_id = auth.uid());
