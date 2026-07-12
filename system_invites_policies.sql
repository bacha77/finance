-- 1. Create policies for system_invites
CREATE POLICY "Admins can view system invites" ON public.system_invites FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins can insert system invites" ON public.system_invites FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins can delete system invites" ON public.system_invites FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role = 'super_admin'));
