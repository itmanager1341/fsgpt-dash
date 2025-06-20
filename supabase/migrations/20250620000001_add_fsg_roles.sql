
-- Add leadership and staff roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leadership';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
