-- ============================================
-- FACIAL RECOGNITION TURNSTILE SYSTEM TABLES
-- ============================================

-- 1) turnstile_face_devices - Hardware device registry
CREATE TABLE public.turnstile_face_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_sn text UNIQUE NOT NULL,
  location text,
  device_type text NOT NULL DEFAULT 'gpio' CHECK (device_type IN ('gpio', 'wiegand')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.turnstile_face_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turnstile_face_devices
CREATE POLICY "Admins and IT can manage devices"
ON public.turnstile_face_devices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Staff can view devices"
ON public.turnstile_face_devices FOR SELECT
USING (is_staff(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- 2) turnstile_face_enrollments - User-to-device face mappings
CREATE TABLE public.turnstile_face_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_sn text NOT NULL REFERENCES public.turnstile_face_devices(device_sn) ON DELETE CASCADE,
  person_id text NOT NULL, -- <=19 bytes for device compatibility
  customer_text text, -- stores Supabase user UUID string for lookup
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT unique_device_user UNIQUE (device_sn, user_id),
  CONSTRAINT unique_device_person UNIQUE (device_sn, person_id),
  CONSTRAINT person_id_length CHECK (length(person_id) <= 19)
);

-- Enable RLS
ALTER TABLE public.turnstile_face_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turnstile_face_enrollments
CREATE POLICY "Admins and IT can manage enrollments"
ON public.turnstile_face_enrollments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Staff can view and manage enrollments"
ON public.turnstile_face_enrollments FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Members can view their own enrollments"
ON public.turnstile_face_enrollments FOR SELECT
USING (user_id = auth.uid());

-- 3) turnstile_face_logs - Access event audit log
CREATE TABLE public.turnstile_face_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_sn text NOT NULL,
  user_id uuid,
  person_id text,
  cap_time text NOT NULL, -- exact string from device
  decision text NOT NULL CHECK (decision IN ('allow', 'deny', 'error')),
  reason text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.turnstile_face_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turnstile_face_logs
CREATE POLICY "Admins and IT can view all logs"
ON public.turnstile_face_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Staff can view all logs"
ON public.turnstile_face_logs FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Members can view their own logs"
ON public.turnstile_face_logs FOR SELECT
USING (user_id = auth.uid());

-- Index for faster log queries
CREATE INDEX idx_turnstile_face_logs_device_sn ON public.turnstile_face_logs(device_sn);
CREATE INDEX idx_turnstile_face_logs_user_id ON public.turnstile_face_logs(user_id);
CREATE INDEX idx_turnstile_face_logs_created_at ON public.turnstile_face_logs(created_at DESC);
CREATE INDEX idx_turnstile_face_enrollments_user_id ON public.turnstile_face_enrollments(user_id);