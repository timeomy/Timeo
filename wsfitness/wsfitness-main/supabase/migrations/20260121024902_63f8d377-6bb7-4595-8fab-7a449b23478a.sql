-- Create a function to get enrollment counts for classes (bypasses RLS for counting)
CREATE OR REPLACE FUNCTION public.get_class_enrollment_counts(class_ids uuid[])
RETURNS TABLE(class_id uuid, enrolled_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ce.class_id,
    COUNT(*) as enrolled_count
  FROM class_enrollments ce
  WHERE ce.class_id = ANY(class_ids)
    AND ce.status = 'enrolled'
  GROUP BY ce.class_id
$$;