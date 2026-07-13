-- 1. Ensure referred_by column exists
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- 2. Update existing policies so that Sales Reps can see their own churches, and Super Admins can see all.
-- First, drop the existing policy if we created one recently
DROP POLICY IF EXISTS "Admins can view all churches" ON public.churches;
-- Create the policy using referred_by
CREATE POLICY "Admins can view all churches" ON public.churches FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'support'))
    OR
    referred_by = auth.uid()
);
