-- Add turnstile_device_ip to company_settings for LAN sync
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS turnstile_device_ip text DEFAULT '192.168.1.201';