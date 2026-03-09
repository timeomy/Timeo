-- Create membership_plans table for dynamic plan management
CREATE TABLE public.membership_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  access_level TEXT NOT NULL DEFAULT 'all_access',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can view active plans, Admins/IT can manage all plans
CREATE POLICY "Anyone can view active plans"
  ON public.membership_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and IT can view all plans"
  ON public.membership_plans
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Admins and IT can manage plans"
  ON public.membership_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

-- Add index for ordering
CREATE INDEX idx_membership_plans_display_order ON public.membership_plans(display_order);
CREATE INDEX idx_membership_plans_is_active ON public.membership_plans(is_active);