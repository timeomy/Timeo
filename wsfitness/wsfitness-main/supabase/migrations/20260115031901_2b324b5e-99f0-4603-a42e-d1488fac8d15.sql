-- Create database webhook to trigger sync-user-to-turnstile on profile changes
-- Note: The webhook configuration is done via Supabase dashboard or pg_net extension

-- First, ensure pg_net extension is available for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION public.trigger_turnstile_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Get Supabase URL from environment (set via vault or config)
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If URL not set, use the known project URL
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://vbeygycoopxwmvjtxdyp.supabase.co';
  END IF;

  -- Make async HTTP request to edge function
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/sync-user-to-turnstile',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Turnstile sync trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table for INSERT and UPDATE
DROP TRIGGER IF EXISTS on_profile_change_sync_turnstile ON public.profiles;

CREATE TRIGGER on_profile_change_sync_turnstile
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.trigger_turnstile_sync();