-- Create referral_claims table
CREATE TABLE IF NOT EXISTS public.referral_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referral_claims ENABLE ROW LEVEL SECURITY;

-- Policies for referral_claims
CREATE POLICY "Employees can view their own claims"
    ON public.referral_claims FOR SELECT
    USING (employee_id = auth.uid() OR 
          EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create their own claims"
    ON public.referral_claims FOR INSERT
    WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins can update claims"
    ON public.referral_claims FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete claims"
    ON public.referral_claims FOR DELETE
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
