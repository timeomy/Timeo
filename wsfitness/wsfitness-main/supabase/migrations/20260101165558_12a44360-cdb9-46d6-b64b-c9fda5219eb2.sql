-- Create gym_classes table for scheduling
CREATE TABLE public.gym_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES public.profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  room TEXT DEFAULT 'Main Studio',
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  class_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and IT can manage all classes" 
ON public.gym_classes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Anyone can view classes" 
ON public.gym_classes 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gym_classes_updated_at
BEFORE UPDATE ON public.gym_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for check_ins table
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;