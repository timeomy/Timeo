-- Create instructor availability table for studio instructors
CREATE TABLE public.instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  specific_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.instructor_availability ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and IT can manage all availability"
ON public.instructor_availability FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Instructors can manage their own availability"
ON public.instructor_availability FOR ALL
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Anyone can view availability"
ON public.instructor_availability FOR SELECT
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_instructor_availability_instructor ON public.instructor_availability(instructor_id);
CREATE INDEX idx_instructor_availability_day ON public.instructor_availability(day_of_week);