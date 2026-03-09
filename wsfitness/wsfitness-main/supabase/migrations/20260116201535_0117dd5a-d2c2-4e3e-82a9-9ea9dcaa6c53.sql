-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create the trigger function to call sync-to-camera edge function
CREATE OR REPLACE FUNCTION public.trigger_sync_to_camera()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Build the webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Get Supabase URL from environment (set via Vault or config)
  supabase_url := current_setting('app.supabase_url', true);
  service_key := current_setting('app.service_role_key', true);

  -- If settings aren't available, use direct function invocation via pg_net
  PERFORM net.http_post(
    url := 'https://vbeygycoopxwmvjtxdyp.supabase.co/functions/v1/sync-to-camera',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZXlneWNvb3B4d212anR4ZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUyOTQ0OCwiZXhwIjoyMDgyMTA1NDQ4fQ.sG6nCPCMxfb_j1KPb9OEcx2lAfMZzG9X3LQY4h6GRGA'
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_change_sync_camera ON public.profiles;

CREATE TRIGGER on_profile_change_sync_camera
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_to_camera();