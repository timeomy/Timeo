-- Add a training_types array column to store multiple training types
ALTER TABLE public.training_logs 
ADD COLUMN training_types text[] DEFAULT NULL;

-- Migrate existing data: copy training_type to training_types array
UPDATE public.training_logs 
SET training_types = ARRAY[training_type::text]
WHERE training_types IS NULL;