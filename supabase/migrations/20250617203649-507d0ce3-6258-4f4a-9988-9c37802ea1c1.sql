
-- Add user status and approval fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update existing profiles to approved status (since they were created under mock auth)
UPDATE public.profiles SET status = 'approved', approved_at = now() WHERE status = 'pending';
