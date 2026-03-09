-- Create turnstile_events table to store events from the Worker
CREATE TABLE public.turnstile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  device_sn text NOT NULL,
  cmd text,
  sequence_no integer,
  cap_time text,
  match_result integer,
  match_failed_reson integer,
  person_id text,
  person_name text,
  customer_text text,
  raw_payload jsonb NOT NULL
);

-- Create index for common queries
CREATE INDEX idx_turnstile_events_received_at ON public.turnstile_events(received_at DESC);
CREATE INDEX idx_turnstile_events_device_sn ON public.turnstile_events(device_sn);
CREATE INDEX idx_turnstile_events_cmd ON public.turnstile_events(cmd);

-- Enable RLS
ALTER TABLE public.turnstile_events ENABLE ROW LEVEL SECURITY;

-- Allow anon role to insert (Worker uses Supabase anon key)
CREATE POLICY "Anon can insert turnstile events"
ON public.turnstile_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated admins/IT to read
CREATE POLICY "Admins and IT can view turnstile events"
ON public.turnstile_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Allow admins to delete old events for cleanup
CREATE POLICY "Admins and IT can delete turnstile events"
ON public.turnstile_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));