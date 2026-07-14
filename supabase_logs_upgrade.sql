-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who performed the action
    action_type TEXT NOT NULL, -- e.g. 'CHURCH_UPDATED', 'ROLE_GRANTED'
    description TEXT NOT NULL, -- e.g. 'Updated plan to Growth for Grace Church'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for system_logs
CREATE POLICY "Super Admins can view all logs"
    ON public.system_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins can insert logs"
    ON public.system_logs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- We intentionally do not allow UPDATE or DELETE on system_logs
