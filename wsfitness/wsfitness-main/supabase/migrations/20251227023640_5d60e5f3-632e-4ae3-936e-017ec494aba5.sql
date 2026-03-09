-- Create check_ins table for member gym visits
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT DEFAULT 'Main Entrance',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Members can view their own check-ins
CREATE POLICY "Members can view their own check-ins"
ON public.check_ins
FOR SELECT
USING (member_id = auth.uid());

-- Members can create their own check-ins
CREATE POLICY "Members can create their own check-ins"
ON public.check_ins
FOR INSERT
WITH CHECK (member_id = auth.uid());

-- Admins and IT can view all check-ins
CREATE POLICY "Admins and IT can view all check-ins"
ON public.check_ins
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Admins and IT can manage all check-ins
CREATE POLICY "Admins and IT can manage all check-ins"
ON public.check_ins
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_check_ins_member_id ON public.check_ins(member_id);
CREATE INDEX idx_check_ins_checked_in_at ON public.check_ins(checked_in_at DESC);