-- Add duration_days column to membership_plans for flexible plan durations
ALTER TABLE public.membership_plans 
ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 0;