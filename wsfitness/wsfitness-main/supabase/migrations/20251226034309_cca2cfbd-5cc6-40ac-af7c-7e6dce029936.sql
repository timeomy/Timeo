-- Create table to track client-coach assignment history
CREATE TABLE public.client_coach_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  previous_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  new_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_client_coach_history_client_id ON public.client_coach_history(client_id);
CREATE INDEX idx_client_coach_history_changed_at ON public.client_coach_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.client_coach_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_coach_history
CREATE POLICY "Admins and IT can view all coach history"
ON public.client_coach_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Admins and IT can insert coach history"
ON public.client_coach_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Coaches can view history for their clients"
ON public.client_coach_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = client_coach_history.client_id 
    AND clients.assigned_coach_id = auth.uid()
  )
);

-- Create exercise definitions table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_type TEXT NOT NULL,
  name TEXT NOT NULL,
  equipment TEXT NOT NULL DEFAULT 'Bodyweight',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_exercises_training_type ON public.exercises(training_type);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercises
CREATE POLICY "Everyone can view exercises"
ON public.exercises
FOR SELECT
USING (true);

CREATE POLICY "Coaches can add custom exercises"
ON public.exercises
FOR INSERT
WITH CHECK (auth.uid() = created_by AND is_custom = true);

CREATE POLICY "Admins and IT can manage all exercises"
ON public.exercises
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Add exercises column to training_logs for detailed exercise tracking
ALTER TABLE public.training_logs
ADD COLUMN IF NOT EXISTS exercises JSONB DEFAULT '[]'::jsonb;

-- Insert predefined exercises for BACK
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('back', 'BACK MACHINE ROW', 'Machine', false),
('back', 'BACK DUMBBELL ROW (INCLINE BENCH)', 'Dumbbell', false),
('back', 'BACK LAT PULLDOWN', 'Machine', false),
('back', 'BACK SEATED CABLE ROW', 'Machine', false),
('back', 'BACK DEADLIFT', 'Barbell', false),
('back', 'BACK PULL-UP', 'Bodyweight', false);

-- Insert predefined exercises for CHEST
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('chest', 'CHEST BENCH PRESS', 'Barbell', false),
('chest', 'CHEST DUMBBELL PRESS', 'Dumbbell', false),
('chest', 'CHEST INCLINE PRESS', 'Barbell', false),
('chest', 'CHEST CABLE FLY', 'Machine', false),
('chest', 'CHEST PEC DECK', 'Machine', false),
('chest', 'CHEST PUSH-UP', 'Bodyweight', false);

-- Insert predefined exercises for LEGS
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('legs', 'LEGS SQUAT', 'Barbell', false),
('legs', 'LEGS LEG PRESS', 'Machine', false),
('legs', 'LEGS LUNGES', 'Dumbbell', false),
('legs', 'LEGS LEG CURL', 'Machine', false),
('legs', 'LEGS LEG EXTENSION', 'Machine', false),
('legs', 'LEGS CALF RAISE', 'Machine', false);

-- Insert predefined exercises for SHOULDERS
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('shoulders', 'SHOULDER OVERHEAD PRESS', 'Barbell', false),
('shoulders', 'SHOULDER LATERAL RAISE', 'Dumbbell', false),
('shoulders', 'SHOULDER FRONT RAISE', 'Dumbbell', false),
('shoulders', 'SHOULDER/BACK FACE PULL', 'Machine', false),
('shoulders', 'SHOULDER REAR DELT FLY', 'Dumbbell', false),
('shoulders', 'SHOULDER SHRUGS', 'Dumbbell', false);

-- Insert predefined exercises for ARMS
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('arms', 'BICEP BARBELL CURL', 'Barbell', false),
('arms', 'BICEP DUMBBELL CURL', 'Dumbbell', false),
('arms', 'BICEP HAMMER CURL', 'Dumbbell', false),
('arms', 'TRICEP PUSHDOWN', 'Machine', false),
('arms', 'TRICEP DIPS', 'Bodyweight', false),
('arms', 'TRICEP SKULL CRUSHER', 'Barbell', false);

-- Insert predefined exercises for CORE
INSERT INTO public.exercises (training_type, name, equipment, is_custom) VALUES
('core', 'CORE PLANK', 'Bodyweight', false),
('core', 'CORE CRUNCHES', 'Bodyweight', false),
('core', 'CORE RUSSIAN TWIST', 'Dumbbell', false),
('core', 'CORE LEG RAISE', 'Bodyweight', false),
('core', 'CORE CABLE CRUNCH', 'Machine', false);