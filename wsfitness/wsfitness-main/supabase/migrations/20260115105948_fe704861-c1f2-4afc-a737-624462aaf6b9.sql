-- Create the command queue table for turnstile sync
CREATE TABLE public.turnstile_command_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_sn TEXT NOT NULL,
  command_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Add index for efficient pending command lookup
CREATE INDEX idx_turnstile_command_queue_pending ON public.turnstile_command_queue(device_sn, status) WHERE status = 'pending';
CREATE INDEX idx_turnstile_command_queue_created ON public.turnstile_command_queue(created_at);

-- Enable RLS
ALTER TABLE public.turnstile_command_queue ENABLE ROW LEVEL SECURITY;

-- Admin/IT Admin can manage all commands
CREATE POLICY "Admins can manage command queue"
ON public.turnstile_command_queue
FOR ALL
USING (
  public.is_it_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.is_it_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'admin')
);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage commands"
ON public.turnstile_command_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');