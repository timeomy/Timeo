-- Tighten security: remove overly permissive INSERT policies flagged by linter
-- These policies allowed anyone (public role) to INSERT into audit_logs/payments.

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service can insert payments" ON public.payments;