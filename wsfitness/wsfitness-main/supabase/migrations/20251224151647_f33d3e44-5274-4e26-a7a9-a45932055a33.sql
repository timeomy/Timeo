-- Create login_logs table to track coach sign-ins
CREATE TABLE public.login_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  logged_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and IT admins can view login logs
CREATE POLICY "Admins and IT can view login logs"
ON public.login_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- Allow the system to insert login logs (via service role or trigger)
CREATE POLICY "Allow authenticated users to log their own login"
ON public.login_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());