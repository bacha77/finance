CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    church_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    issue_title TEXT NOT NULL,
    issue_description TEXT,
    status TEXT DEFAULT 'Open', -- Open, In Progress, Resolved
    priority TEXT DEFAULT 'Medium', -- Low, Medium, Urgent
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all support tickets"
    ON public.support_tickets FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can insert support tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can update support tickets"
    ON public.support_tickets FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Admins can delete support tickets"
    ON public.support_tickets FOR DELETE
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
