-- Create document_templates table for waivers and contracts
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  require_signature BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create member_document_signatures table for tracking signed documents
CREATE TABLE public.member_document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signature_data TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_document_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Admins and IT can manage document templates" ON public.document_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Members can view active templates" ON public.document_templates
  FOR SELECT USING (is_active = true);

-- RLS policies for member_document_signatures
CREATE POLICY "Admins and IT can manage all signatures" ON public.member_document_signatures
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR is_it_admin(auth.uid()));

CREATE POLICY "Members can view their own signatures" ON public.member_document_signatures
  FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "Members can sign documents" ON public.member_document_signatures
  FOR INSERT WITH CHECK (member_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();