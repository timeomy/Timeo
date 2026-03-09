-- Add weight_kg column to training_logs for weight tracking
ALTER TABLE public.training_logs
ADD COLUMN weight_kg numeric(5,2) DEFAULT NULL;

-- Create a view for getting last weight per client per training type
CREATE OR REPLACE FUNCTION public.get_last_weight(p_client_id uuid, p_training_type text)
RETURNS numeric
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