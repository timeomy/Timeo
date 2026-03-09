-- Create company_settings table for e-invoicing
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'My Gym Sdn Bhd',
  address TEXT,
  tax_id TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  registration_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - only admins can manage
CREATE POLICY "Admins and IT can manage company settings" ON public.company_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Anyone can view company settings" ON public.company_settings
  FOR SELECT USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.company_settings (company_name, address, tax_id)
VALUES ('WS Fitness Sdn Bhd', 'No. 123, Jalan Fitness, 50000 Kuala Lumpur', 'C12345678901');