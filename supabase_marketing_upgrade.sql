CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_name TEXT NOT NULL,
    platform TEXT NOT NULL, -- e.g., Facebook, Google, Email
    status TEXT DEFAULT 'Active', -- Active, Paused, Completed
    budget NUMERIC(10,2) DEFAULT 0,
    spend NUMERIC(10,2) DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all marketing campaigns"
    ON public.marketing_campaigns FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can insert marketing campaigns"
    ON public.marketing_campaigns FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can update marketing campaigns"
    ON public.marketing_campaigns FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can delete marketing campaigns"
    ON public.marketing_campaigns FOR DELETE
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
