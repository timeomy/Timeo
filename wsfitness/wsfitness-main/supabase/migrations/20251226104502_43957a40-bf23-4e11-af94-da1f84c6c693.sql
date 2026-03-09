-- Add video_url column to exercises table
ALTER TABLE public.exercises ADD COLUMN video_url text;

-- Update Leg Reverse Hyperextension with example video URL
UPDATE public.exercises 
SET video_url = 'https://www.instagram.com/reel/DRhxl8KD-iU/'
WHERE name = 'Leg Reverse Hyperextension';