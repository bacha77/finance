-- 1. Create policies for system_invites
DROP POLICY IF EXISTS "Admins can view system invites" ON public.system_invites;
CREATE POLICY "Admins can view system invites" ON public.system_invites FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can insert system invites" ON public.system_invites;
CREATE POLICY "Admins can insert system invites" ON public.system_invites FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete system invites" ON public.system_invites;
CREATE POLICY "Admins can delete system invites" ON public.system_invites FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can update system invites" ON public.system_invites;
CREATE POLICY "Admins can update system invites" ON public.system_invites FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));
