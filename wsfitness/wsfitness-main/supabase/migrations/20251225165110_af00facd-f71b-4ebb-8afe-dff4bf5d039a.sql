-- Update IT admin email from .com to .my
UPDATE auth.users 
SET email = 'itadmin@wsfitness.my', 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'itadmin@wsfitness.com';

-- Also update in profiles table
UPDATE public.profiles 
SET email = 'itadmin@wsfitness.my',
    updated_at = NOW()
WHERE email = 'itadmin@wsfitness.com';