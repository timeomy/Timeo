-- Add sessions column to membership_plans for explicit session tracking
ALTER TABLE public.membership_plans ADD COLUMN sessions integer DEFAULT NULL;

-- Populate sessions for existing coach training plans based on known data
UPDATE public.membership_plans SET sessions = 1 WHERE id = 'd762c8e7-984f-4598-981e-d0be0003a79e'; -- COACH TRAINING ¹ˣ
UPDATE public.membership_plans SET sessions = 16 WHERE id = 'cf4d498c-3082-40e5-8e70-647f8c6ae4cb'; -- COACH TRAINING · ˣ¹⁶
UPDATE public.membership_plans SET sessions = 48 WHERE id = '47a7eca4-9a02-4e6f-a18e-38bb000fbfb7'; -- COACH TRAINING · ˣ⁴⁸
UPDATE public.membership_plans SET sessions = 99 WHERE id = 'b3278c0c-cd8f-4c1f-a371-0151f2d1704c'; -- COACH TRAINING · ˣ⁹⁹

-- Also set sessions for studio classes that have session-based plans
UPDATE public.membership_plans SET sessions = 1 WHERE title ILIKE '%¹ᵈᵃʸ%' OR title ILIKE '%1 Session%';
UPDATE public.membership_plans SET sessions = 4 WHERE title ILIKE '%ˣ⁴%' AND title NOT ILIKE '%ˣ⁴⁸%';
UPDATE public.membership_plans SET sessions = 8 WHERE title ILIKE '%ˣ⁸%';
UPDATE public.membership_plans SET sessions = 10 WHERE title ILIKE '%ˣ¹⁰%';
