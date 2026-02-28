-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- RLS helper function: set tenant context for the current transaction
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to application user
-- Note: Replace 'timeo' with your POSTGRES_USER if different
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'timeo') THEN
    GRANT EXECUTE ON FUNCTION set_tenant_context(text) TO timeo;
  END IF;
END
$$;
