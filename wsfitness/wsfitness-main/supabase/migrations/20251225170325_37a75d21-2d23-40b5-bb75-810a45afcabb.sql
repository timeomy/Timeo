-- Create a function to calculate expiry date based on package type
CREATE OR REPLACE FUNCTION public.calculate_expiry_date()
RETURNS TRIGGER AS $$
DECLARE
  join_date DATE;
  calculated_expiry DATE;
BEGIN
  -- Use current date as join date when creating a new client
  join_date := CURRENT_DATE;
  
  -- Calculate expiry based on package type
  CASE 
    -- CT16 and PT16: Add 6 weeks (42 days)
    WHEN NEW.package_type IN ('CT16', 'PT16', 'CT-16', 'PT-16') THEN
      calculated_expiry := join_date + INTERVAL '42 days';
    
    -- CT48: Add 5 months + 2 weeks
    WHEN NEW.package_type IN ('CT48', 'CT-48') THEN
      calculated_expiry := join_date + INTERVAL '5 months 2 weeks';
    
    -- CT99: Add 365 days
    WHEN NEW.package_type IN ('CT99', 'CT-99') THEN
      calculated_expiry := join_date + INTERVAL '365 days';
    
    -- CT12: Add 4 weeks (28 days) - proportional to sessions
    WHEN NEW.package_type IN ('CT12', 'CT-12') THEN
      calculated_expiry := join_date + INTERVAL '4 weeks';
    
    -- CT24: Add 3 months
    WHEN NEW.package_type IN ('CT24', 'CT-24') THEN
      calculated_expiry := join_date + INTERVAL '3 months';
    
    -- PT-DAY and CUSTOM: Don't auto-calculate, leave as set by admin
    ELSE
      calculated_expiry := NULL;
  END CASE;
  
  -- Only set expiry_date if not already set (for CUSTOM) or if it's a new INSERT
  IF TG_OP = 'INSERT' AND calculated_expiry IS NOT NULL THEN
    NEW.expiry_date := calculated_expiry;
  -- On UPDATE, only recalculate if package_type changed and expiry wasn't manually set
  ELSIF TG_OP = 'UPDATE' AND OLD.package_type IS DISTINCT FROM NEW.package_type AND calculated_expiry IS NOT NULL AND NEW.expiry_date IS NULL THEN
    NEW.expiry_date := calculated_expiry;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-calculating expiry date on insert
DROP TRIGGER IF EXISTS calculate_client_expiry_on_insert ON public.clients;
CREATE TRIGGER calculate_client_expiry_on_insert
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  WHEN (NEW.expiry_date IS NULL)
  EXECUTE FUNCTION public.calculate_expiry_date();

-- Create trigger for auto-calculating expiry date on update when package changes
DROP TRIGGER IF EXISTS calculate_client_expiry_on_update ON public.clients;
CREATE TRIGGER calculate_client_expiry_on_update
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  WHEN (OLD.package_type IS DISTINCT FROM NEW.package_type AND NEW.expiry_date IS NULL)
  EXECUTE FUNCTION public.calculate_expiry_date();