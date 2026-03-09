-- Create renewal_logs table for audit trail
CREATE TABLE public.renewal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  performed_by UUID NOT NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Manual Renewal',
  previous_expiry DATE NULL,
  new_expiry DATE NOT NULL,
  previous_status TEXT NULL,
  new_status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewal_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and IT can view all renewal logs"
ON public.renewal_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Admins and IT can insert renewal logs"
ON public.renewal_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()) OR has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can view their own renewal logs"
ON public.renewal_logs
FOR SELECT
USING (performed_by = auth.uid());

CREATE POLICY "Members can view their own renewal history"
ON public.renewal_logs
FOR SELECT
USING (user_id = auth.uid());

-- Add index for faster queries
CREATE INDEX idx_renewal_logs_user_id ON public.renewal_logs(user_id);
CREATE INDEX idx_renewal_logs_performed_by ON public.renewal_logs(performed_by);
CREATE INDEX idx_renewal_logs_created_at ON public.renewal_logs(created_at DESC);