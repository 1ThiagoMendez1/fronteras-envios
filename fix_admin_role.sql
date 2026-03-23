-- Fix for existing admin user role if trigger didn't fire or role was wrong
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@fronteras.com';

-- Ensure the user exists in profiles if somehow missing
INSERT INTO public.profiles (id, email, name, role)
SELECT id, email, 'Super Admin', 'admin'
FROM auth.users
WHERE email = 'admin@fronteras.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
