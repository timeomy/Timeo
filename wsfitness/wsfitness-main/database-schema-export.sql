-- ============================================
-- WS FITNESS COMPLETE DATABASE SCHEMA
-- Generated for Supabase Migration
-- ============================================

-- ============================================
-- 1. CUSTOM ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'it_admin', 'member', 'vendor', 'staff');
CREATE TYPE public.client_status AS ENUM ('active', 'expired');
CREATE TYPE public.training_type AS ENUM ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'full_body', 'stretching');

-- ============================================
-- 2. TABLES
-- ============================================

-- Profiles table (core user data)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    member_id TEXT UNIQUE,
    nfc_card_id TEXT UNIQUE,
    qr_code_url TEXT,
    email_change_count INTEGER NOT NULL DEFAULT 0,
    waiver_signature_name TEXT,
    waiver_signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (for RBAC)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Memberships table
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    plan_type TEXT NOT NULL DEFAULT 'standard',
    status TEXT NOT NULL DEFAULT 'active',
    valid_from DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_memberships_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Check-ins table
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    location TEXT DEFAULT 'Main Entrance',
    notes TEXT,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vendors table
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    total_redeemed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_vendors_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Vouchers table
CREATE TABLE public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'valid',
    member_id UUID,
    vendor_id UUID,
    valid_from TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    max_redemptions INTEGER,
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT vouchers_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL
);

-- Member vouchers junction table
CREATE TABLE public.member_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    voucher_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT member_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE
);

-- Redemption logs table
CREATE TABLE public.redemption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    member_id UUID,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT redemption_logs_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE,
    CONSTRAINT redemption_logs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE
);

-- Clients table (for coaching)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    package_type TEXT NOT NULL DEFAULT 'CT48',
    status public.client_status NOT NULL DEFAULT 'active',
    assigned_coach_id UUID,
    total_sessions_purchased INTEGER NOT NULL DEFAULT 0,
    carry_over_sessions INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client coach history table
CREATE TABLE public.client_coach_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    previous_coach_id UUID,
    new_coach_id UUID,
    changed_by UUID NOT NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT client_coach_history_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
    CONSTRAINT client_coach_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id),
    CONSTRAINT client_coach_history_previous_coach_id_fkey FOREIGN KEY (previous_coach_id) REFERENCES public.profiles(id),
    CONSTRAINT client_coach_history_new_coach_id_fkey FOREIGN KEY (new_coach_id) REFERENCES public.profiles(id)
);

-- Training logs table
CREATE TABLE public.training_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    coach_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    training_type public.training_type NOT NULL,
    training_types TEXT[],
    weight_kg NUMERIC,
    sessions_used INTEGER NOT NULL DEFAULT 1,
    exercises JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT training_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Exercises table
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    training_type TEXT NOT NULL,
    equipment TEXT NOT NULL DEFAULT 'Bodyweight',
    video_url TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Gym classes table
CREATE TABLE public.gym_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    instructor_id UUID,
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    room TEXT DEFAULT 'Main Studio',
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    class_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT gym_classes_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id)
);

-- Class enrollments table
CREATE TABLE public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL,
    member_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'enrolled',
    attended BOOLEAN DEFAULT false,
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.gym_classes(id) ON DELETE CASCADE
);

-- Company settings table
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'My Gym Sdn Bhd',
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    registration_number TEXT,
    tax_id TEXT,
    require_profile_photo BOOLEAN NOT NULL DEFAULT true,
    max_email_changes INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invite codes table
CREATE TABLE public.invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_by UUID,
    max_uses INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document templates table
CREATE TABLE public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    require_signature BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Member document signatures table
CREATE TABLE public.member_document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    member_id UUID NOT NULL,
    signature_data TEXT,
    ip_address TEXT,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT member_document_signatures_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_templates(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    member_id UUID NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT,
    buyer_phone TEXT,
    buyer_address TEXT,
    buyer_tin TEXT,
    buyer_brn TEXT,
    seller_name TEXT DEFAULT 'WS Fitness Sdn Bhd',
    seller_email TEXT DEFAULT 'billing@wsfitness.com',
    seller_phone TEXT DEFAULT '+60123456789',
    seller_address TEXT DEFAULT 'No. 123, Jalan Fitness, 50000 Kuala Lumpur',
    seller_tin TEXT DEFAULT 'C12345678901',
    seller_brn TEXT DEFAULT '202001012345',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'MYR',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice items table
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    tax_rate NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    classification_code TEXT DEFAULT '001',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE
);

-- Payment requests table
CREATE TABLE public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    order_id TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payer_name TEXT,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT payment_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'MYR',
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    invoice_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Login logs table
CREATE TABLE public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT NOT NULL,
    logged_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_name TEXT NOT NULL,
    target_user_id UUID,
    target_user_name TEXT,
    action_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Member ID counter table
CREATE TABLE public.member_id_counter (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_value INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(year FROM now())
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX idx_profiles_member_id ON public.profiles(member_id);
CREATE INDEX idx_profiles_nfc_card_id ON public.profiles(nfc_card_id);
CREATE INDEX idx_check_ins_member_id ON public.check_ins(member_id);
CREATE INDEX idx_check_ins_checked_in_at ON public.check_ins(checked_in_at);
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_training_logs_client_id ON public.training_logs(client_id);
CREATE INDEX idx_training_logs_coach_id ON public.training_logs(coach_id);
CREATE INDEX idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_member_id ON public.class_enrollments(member_id);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Check if user is IT admin
CREATE OR REPLACE FUNCTION public.is_it_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'it_admin'
  )
$$;

-- Check if user is member
CREATE OR REPLACE FUNCTION public.is_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'member'
  )
$$;

-- Check if user is vendor
CREATE OR REPLACE FUNCTION public.is_vendor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'vendor'
  )
$$;

-- Check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'staff'
  )
$$;

-- Generate unique member ID (8 hex chars)
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := '0123456789ABCDEF';
  result TEXT := '';
  i INT;
  new_member_id TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    new_member_id := result;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.member_id = new_member_id) THEN
      RETURN new_member_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique member ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Get last weight for a client and training type
CREATE OR REPLACE FUNCTION public.get_last_weight(p_client_id UUID, p_training_type TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT weight_kg
  FROM public.training_logs
  WHERE client_id = p_client_id 
    AND (p_training_type = ANY(training_types) OR training_type::text = p_training_type)
    AND weight_kg IS NOT NULL
  ORDER BY date DESC, created_at DESC
  LIMIT 1
$$;

-- Use invite code
CREATE OR REPLACE FUNCTION public.use_invite_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO code_record
  FROM invite_codes
  WHERE code = UPPER(TRIM(input_code))
    AND is_active = true
    AND (max_uses IS NULL OR times_used < max_uses)
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE invite_codes
  SET times_used = times_used + 1
  WHERE id = code_record.id;
  
  RETURN true;
END;
$$;

-- Handle new user (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

-- Handle new user role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Handle new member signup (create pending membership)
CREATE OR REPLACE FUNCTION public.handle_new_member_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = 'member'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.memberships WHERE user_id = NEW.user_id
    ) THEN
      INSERT INTO public.memberships (user_id, plan_type, status, valid_from)
      VALUES (NEW.user_id, 'Pending', 'pending_approval', CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Calculate expiry date for clients
CREATE OR REPLACE FUNCTION public.calculate_expiry_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  join_date DATE;
  calculated_expiry DATE;
BEGIN
  join_date := CURRENT_DATE;
  
  CASE 
    WHEN NEW.package_type IN ('CT16', 'PT16', 'CT-16', 'PT-16') THEN
      calculated_expiry := join_date + INTERVAL '42 days';
    WHEN NEW.package_type IN ('CT48', 'CT-48') THEN
      calculated_expiry := join_date + INTERVAL '5 months 2 weeks';
    WHEN NEW.package_type IN ('CT99', 'CT-99') THEN
      calculated_expiry := join_date + INTERVAL '365 days';
    WHEN NEW.package_type IN ('CT12', 'CT-12') THEN
      calculated_expiry := join_date + INTERVAL '4 weeks';
    WHEN NEW.package_type IN ('CT24', 'CT-24') THEN
      calculated_expiry := join_date + INTERVAL '3 months';
    ELSE
      calculated_expiry := NULL;
  END CASE;
  
  IF TG_OP = 'INSERT' AND calculated_expiry IS NOT NULL THEN
    NEW.expiry_date := calculated_expiry;
  ELSIF TG_OP = 'UPDATE' AND OLD.package_type IS DISTINCT FROM NEW.package_type AND calculated_expiry IS NOT NULL AND NEW.expiry_date IS NULL THEN
    NEW.expiry_date := calculated_expiry;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger: Create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Assign default role when user signs up
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Trigger: Create pending membership for new members
CREATE TRIGGER on_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_member_signup();

-- Trigger: Calculate expiry date for clients
CREATE TRIGGER calculate_client_expiry
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.calculate_expiry_date();

-- Trigger: Update updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gym_classes_updated_at BEFORE UPDATE ON public.gym_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_coach_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_id_counter ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "IT Admins can view all profiles" ON public.profiles FOR SELECT USING (is_it_admin(auth.uid()));
CREATE POLICY "IT Admins can update all profiles" ON public.profiles FOR UPDATE USING (is_it_admin(auth.uid())) WITH CHECK (is_it_admin(auth.uid()));

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage non-IT roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin') AND role <> 'it_admin') WITH CHECK (has_role(auth.uid(), 'admin') AND role <> 'it_admin');
CREATE POLICY "IT Admins can manage all roles" ON public.user_roles FOR ALL USING (is_it_admin(auth.uid()));
CREATE POLICY "Users can self-assign coach role" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'coach');

-- MEMBERSHIPS POLICIES
CREATE POLICY "Users can view their own membership" ON public.memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all memberships" ON public.memberships FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage memberships" ON public.memberships FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "IT Admins can view all memberships" ON public.memberships FOR SELECT USING (is_it_admin(auth.uid()));
CREATE POLICY "IT Admins can manage memberships" ON public.memberships FOR ALL USING (is_it_admin(auth.uid())) WITH CHECK (is_it_admin(auth.uid()));

-- CHECK_INS POLICIES
CREATE POLICY "Members can view their own check-ins" ON public.check_ins FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Members can create their own check-ins" ON public.check_ins FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "Admins and IT can view all check-ins" ON public.check_ins FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));
CREATE POLICY "Admins and IT can manage all check-ins" ON public.check_ins FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- VENDORS POLICIES
CREATE POLICY "Anyone can view vendor list" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendors can view their own vendor profile" ON public.vendors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all vendors" ON public.vendors FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "IT Admins can view all vendors" ON public.vendors FOR SELECT USING (is_it_admin(auth.uid()));
CREATE POLICY "IT Admins can manage vendors" ON public.vendors FOR ALL USING (is_it_admin(auth.uid())) WITH CHECK (is_it_admin(auth.uid()));

-- VOUCHERS POLICIES
CREATE POLICY "Members can view available vouchers" ON public.vouchers FOR SELECT USING (member_id = auth.uid() OR member_id IS NULL);
CREATE POLICY "Vendors can view vouchers for their business" ON public.vouchers FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendors can update voucher status" ON public.vouchers FOR UPDATE USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Admins and IT can manage all vouchers" ON public.vouchers FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- MEMBER_VOUCHERS POLICIES
CREATE POLICY "Members can view their own vouchers" ON public.member_vouchers FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Admins and IT can manage member_vouchers" ON public.member_vouchers FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- REDEMPTION_LOGS POLICIES
CREATE POLICY "Vendors can view their own redemptions" ON public.redemption_logs FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendors can insert redemptions" ON public.redemption_logs FOR INSERT WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Admins and IT can manage all redemption_logs" ON public.redemption_logs FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- CLIENTS POLICIES
CREATE POLICY "Coaches can view their assigned clients" ON public.clients FOR SELECT USING (assigned_coach_id = auth.uid());
CREATE POLICY "Coaches can add their own clients" ON public.clients FOR INSERT WITH CHECK (assigned_coach_id = auth.uid());
CREATE POLICY "Coaches can update their assigned clients" ON public.clients FOR UPDATE USING (assigned_coach_id = auth.uid());
CREATE POLICY "Coaches can delete their assigned clients" ON public.clients FOR DELETE USING (assigned_coach_id = auth.uid());
CREATE POLICY "Admins and IT can manage all clients" ON public.clients FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- CLIENT_COACH_HISTORY POLICIES
CREATE POLICY "Coaches can view history for their clients" ON public.client_coach_history FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_coach_history.client_id AND clients.assigned_coach_id = auth.uid()));
CREATE POLICY "Admins and IT can view all coach history" ON public.client_coach_history FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));
CREATE POLICY "Admins and IT can insert coach history" ON public.client_coach_history FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- TRAINING_LOGS POLICIES
CREATE POLICY "Coaches can manage their training logs" ON public.training_logs FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Coaches can view logs for their clients" ON public.training_logs FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = training_logs.client_id AND clients.assigned_coach_id = auth.uid()));
CREATE POLICY "Admins and IT can manage all training logs" ON public.training_logs FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- EXERCISES POLICIES
CREATE POLICY "Everyone can view exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Coaches can add custom exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Admins and IT can manage all exercises" ON public.exercises FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- GYM_CLASSES POLICIES
CREATE POLICY "Anyone can view classes" ON public.gym_classes FOR SELECT USING (true);
CREATE POLICY "Admins and IT can manage all classes" ON public.gym_classes FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- CLASS_ENROLLMENTS POLICIES
CREATE POLICY "Members can view their own enrollments" ON public.class_enrollments FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Members can enroll themselves" ON public.class_enrollments FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "Members can cancel their own enrollments" ON public.class_enrollments FOR UPDATE USING (member_id = auth.uid());
CREATE POLICY "Admins and IT can manage all enrollments" ON public.class_enrollments FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- COMPANY_SETTINGS POLICIES
CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Admins and IT can manage company settings" ON public.company_settings FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- INVITE_CODES POLICIES
CREATE POLICY "Admins can manage invite codes" ON public.invite_codes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- DOCUMENT_TEMPLATES POLICIES
CREATE POLICY "Members can view active templates" ON public.document_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and IT can manage document templates" ON public.document_templates FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- MEMBER_DOCUMENT_SIGNATURES POLICIES
CREATE POLICY "Members can view their own signatures" ON public.member_document_signatures FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Members can sign documents" ON public.member_document_signatures FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "Admins and IT can manage all signatures" ON public.member_document_signatures FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- INVOICES POLICIES
CREATE POLICY "Members can view their own invoices" ON public.invoices FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- INVOICE_ITEMS POLICIES
CREATE POLICY "Members can view their invoice items" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.member_id = auth.uid()));
CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- PAYMENT_REQUESTS POLICIES
CREATE POLICY "Users can view own payment requests" ON public.payment_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can submit payment requests" ON public.payment_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update pending or rejected payment requests" ON public.payment_requests FOR UPDATE USING (user_id = auth.uid() AND status IN ('pending_verification', 'rejected')) WITH CHECK (user_id = auth.uid() AND status IN ('pending_verification', 'rejected'));
CREATE POLICY "Admins can manage all payment requests" ON public.payment_requests FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- PAYMENTS POLICIES
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins and IT can view all payments" ON public.payments FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));
CREATE POLICY "Admins and IT can manage all payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- LOGIN_LOGS POLICIES
CREATE POLICY "Allow authenticated users to log their own login" ON public.login_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins and IT can view login logs" ON public.login_logs FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- AUDIT_LOGS POLICIES
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "IT Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (is_it_admin(auth.uid()));
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- MEMBER_ID_COUNTER POLICIES
CREATE POLICY "Admins can manage member_id_counter" ON public.member_id_counter FOR ALL USING (has_role(auth.uid(), 'admin') OR is_it_admin(auth.uid()));

-- ============================================
-- 8. STORAGE BUCKETS
-- ============================================

-- Create storage buckets (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies for avatars bucket
-- CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for receipts bucket
-- CREATE POLICY "Receipts are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
-- CREATE POLICY "Users can upload their own receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 9. INITIAL DATA (Optional)
-- ============================================

-- Insert default company settings
INSERT INTO public.company_settings (company_name) VALUES ('WS Fitness Sdn Bhd') ON CONFLICT DO NOTHING;

-- ============================================
-- END OF SCHEMA
-- ============================================
