
-- Create access_levels table for admin-managed plan categories
CREATE TABLE public.access_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text DEFAULT '',
  color text DEFAULT 'slate',
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read access levels
CREATE POLICY "Authenticated users can read access levels"
ON public.access_levels FOR SELECT TO authenticated USING (true);

-- Only admins can manage access levels
CREATE POLICY "Admins can insert access levels"
ON public.access_levels FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it_admin'));

CREATE POLICY "Admins can update access levels"
ON public.access_levels FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it_admin'));

CREATE POLICY "Admins can delete access levels"
ON public.access_levels FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it_admin'));

-- Seed with existing access levels
INSERT INTO public.access_levels (key, label, emoji, color, display_order) VALUES
  ('promo', 'THIS MONTH PROMO', '🔥', 'amber', 0),
  ('studio_class', 'STUDIO CLASS', '🏋️', 'purple', 1),
  ('all_access', 'GYM ACCESS', '💪', 'emerald', 2),
  ('training', 'TRAINING', '🎯', 'red', 3),
  ('day_pass', 'DAY PASS', '📅', 'slate', 4);
