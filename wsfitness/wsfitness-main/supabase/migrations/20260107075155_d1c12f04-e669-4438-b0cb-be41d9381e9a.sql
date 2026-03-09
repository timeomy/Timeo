-- Add 'day_pass' to the app_role enum for temporary walk-in users
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'day_pass';