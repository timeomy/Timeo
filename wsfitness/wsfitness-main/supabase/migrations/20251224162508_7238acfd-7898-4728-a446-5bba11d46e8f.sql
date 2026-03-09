-- Create audit_logs table for tracking user management actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text NOT NULL,
  target_user_id uuid,
  target_user_name text,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs (action_type);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only IT Admins and Admins can view audit logs
CREATE POLICY "IT Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (is_it_admin(auth.uid()));

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only edge functions (service role) can insert logs
-- Users can insert their own action logs
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);
