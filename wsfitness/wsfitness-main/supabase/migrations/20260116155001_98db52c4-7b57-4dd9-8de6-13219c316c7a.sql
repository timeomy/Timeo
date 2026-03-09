-- TASK 1: Add Supabase tables (additive only)

-- 1A. Add missing columns to turnstile_events if not exist
DO $$ 
BEGIN
  -- Add is_rejected column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turnstile_events' AND column_name = 'is_rejected') THEN
    ALTER TABLE public.turnstile_events ADD COLUMN is_rejected boolean DEFAULT false;
  END IF;
  
  -- Add reject_reason column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turnstile_events' AND column_name = 'reject_reason') THEN
    ALTER TABLE public.turnstile_events ADD COLUMN reject_reason text;
  END IF;
END $$;

-- 1B. Create turnstile_devices table (device allowlist) - reuse turnstile_face_devices if similar but add missing columns
DO $$ 
BEGIN
  -- Add device_no column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turnstile_face_devices' AND column_name = 'device_no') THEN
    ALTER TABLE public.turnstile_face_devices ADD COLUMN device_no text;
  END IF;
  
  -- Add addr_no column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turnstile_face_devices' AND column_name = 'addr_no') THEN
    ALTER TABLE public.turnstile_face_devices ADD COLUMN addr_no text;
  END IF;
  
  -- Add addr_name column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turnstile_face_devices' AND column_name = 'addr_name') THEN
    ALTER TABLE public.turnstile_face_devices ADD COLUMN addr_name text;
  END IF;
END $$;

-- 1C. Create turnstile_verifications table
CREATE TABLE IF NOT EXISTS public.turnstile_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz DEFAULT now(),
  device_sn text,
  math_type int,
  qrcode text,
  match_state int,
  person_id text,
  person_name text,
  decision_code int NOT NULL DEFAULT 1,
  decision_desc text,
  raw_payload jsonb NOT NULL,
  is_rejected boolean DEFAULT false,
  reject_reason text
);

-- 1D. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_turnstile_events_device_received 
  ON public.turnstile_events(device_sn, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_turnstile_events_cmd_received 
  ON public.turnstile_events(cmd, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_turnstile_verifications_device_received 
  ON public.turnstile_verifications(device_sn, received_at DESC);

-- 1E. Enable RLS on turnstile_verifications
ALTER TABLE public.turnstile_verifications ENABLE ROW LEVEL SECURITY;

-- RLS for turnstile_verifications: admin/IT can read/write, anon can insert (for Worker)
CREATE POLICY "Admins and IT can view turnstile verifications" 
  ON public.turnstile_verifications 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Admins and IT can manage turnstile verifications" 
  ON public.turnstile_verifications 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Anon can insert turnstile verifications" 
  ON public.turnstile_verifications 
  FOR INSERT 
  WITH CHECK (true);

-- TASK 2: Create member_access_view (Option A - using existing memberships table)
CREATE OR REPLACE VIEW public.member_access_view AS
SELECT 
  p.member_id AS person_id,
  p.id AS user_id,
  p.name,
  CASE 
    WHEN m.status IS NULL THEN 'no_membership'
    WHEN m.status = 'pending_approval' THEN 'pending'
    WHEN m.status = 'expired' THEN 'expired'
    WHEN m.status = 'suspended' THEN 'suspended'
    WHEN m.status = 'active' AND m.expiry_date IS NOT NULL AND m.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN m.status = 'active' THEN 'active'
    ELSE m.status
  END AS membership_status,
  m.expiry_date::timestamptz AS valid_until,
  m.plan_type
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.member_id IS NOT NULL;