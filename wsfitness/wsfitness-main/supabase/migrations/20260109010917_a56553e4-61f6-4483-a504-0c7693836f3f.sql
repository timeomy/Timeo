-- Create training_programs table
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  sessions_per_week INTEGER NOT NULL DEFAULT 3,
  level TEXT NOT NULL DEFAULT 'beginner',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active programs" 
ON public.training_programs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins and IT can view all programs" 
ON public.training_programs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Admins and IT can manage programs" 
ON public.training_programs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_training_programs_updated_at
BEFORE UPDATE ON public.training_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default programs
INSERT INTO public.training_programs (name, description, duration_weeks, sessions_per_week, level, is_active) VALUES
('Beginner Strength', 'Perfect for those new to weight training. Focus on proper form and building a foundation.', 8, 3, 'beginner', true),
('HIIT Cardio Blast', 'High-intensity interval training to maximize calorie burn and improve cardiovascular health.', 6, 4, 'intermediate', true),
('Advanced Bodybuilding', 'Intensive hypertrophy program for experienced lifters looking to maximize muscle growth.', 12, 5, 'advanced', false);