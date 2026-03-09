-- Create class_enrollments table for member bookings
CREATE TABLE public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.gym_classes(id) ON DELETE CASCADE NOT NULL,
  member_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'cancelled', 'no_show')),
  UNIQUE(class_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and IT can manage all enrollments" 
ON public.class_enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Members can view their own enrollments" 
ON public.class_enrollments 
FOR SELECT 
USING (member_id = auth.uid());

CREATE POLICY "Members can enroll themselves" 
ON public.class_enrollments 
FOR INSERT 
WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members can cancel their own enrollments" 
ON public.class_enrollments 
FOR UPDATE 
USING (member_id = auth.uid());

-- Create invoices table for Malaysian e-invoicing
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  member_id UUID NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  -- Malaysian e-Invoice required fields
  seller_tin TEXT DEFAULT 'C12345678901',
  seller_brn TEXT DEFAULT '202001012345',
  seller_name TEXT DEFAULT 'WS Fitness Sdn Bhd',
  seller_address TEXT DEFAULT 'No. 123, Jalan Fitness, 50000 Kuala Lumpur',
  seller_phone TEXT DEFAULT '+60123456789',
  seller_email TEXT DEFAULT 'billing@wsfitness.com',
  buyer_tin TEXT,
  buyer_brn TEXT,
  buyer_name TEXT NOT NULL,
  buyer_address TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  -- Invoice details
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  classification_code TEXT DEFAULT '001',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoice policies
CREATE POLICY "Admins can manage all invoices" 
ON public.invoices 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Members can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (member_id = auth.uid());

CREATE POLICY "Admins can manage all invoice items" 
ON public.invoice_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Members can view their invoice items" 
ON public.invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.member_id = auth.uid()
));

-- Create trigger for invoice updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for enrollments
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_enrollments;