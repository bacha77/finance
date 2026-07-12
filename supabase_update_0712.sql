-- 1. Ensure admins has a role column
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin';

-- 2. Create system_invites table for multi-role staff invites
DROP TABLE IF EXISTS public.system_invites;
CREATE TABLE public.system_invites (
    email TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    job_title TEXT,
    roles TEXT[] NOT NULL DEFAULT '{}',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_invites ENABLE ROW LEVEL SECURITY;

-- 3. Update handle_new_user to process multi-role invites on account creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_church_id UUID;
    target_role TEXT;
    sys_invite public.system_invites%ROWTYPE;
    r TEXT;
BEGIN
    -- Check if this email was invited to a specific church
    SELECT church_id, role INTO target_church_id, target_role 
    FROM public.invites 
    WHERE email = new.email 
    LIMIT 1;

    -- Check system invites
    SELECT * INTO sys_invite FROM public.system_invites WHERE email = new.email LIMIT 1;

    INSERT INTO public.profiles (id, email, full_name, phone, church_id, role)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', sys_invite.first_name, sys_invite.last_name)), ''),
            new.raw_user_meta_data->>'full_name'
        ),
        sys_invite.phone,
        target_church_id, 
        COALESCE(target_role, 'admin')
    );
    
    -- Cleanup used church invites
    IF target_church_id IS NOT NULL THEN
        DELETE FROM public.invites WHERE email = new.email AND church_id = target_church_id;
    END IF;

    -- Insert multiple roles if sys_invite exists
    IF sys_invite.email IS NOT NULL THEN
        -- Insert each role
        FOREACH r IN ARRAY sys_invite.roles
        LOOP
            -- Avoid duplicates if the schema allows it, but basic insert:
            BEGIN
                INSERT INTO public.admins (user_id, role) VALUES (new.id, r);
            EXCEPTION WHEN unique_violation THEN
                -- Do nothing if duplicate
            END;
        END LOOP;
        
        DELETE FROM public.system_invites WHERE email = new.email;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Create marketing_leads table for the CRM
CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New',
    source TEXT DEFAULT 'Cold Outreach',
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    converted_church_id UUID REFERENCES public.churches(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Allow super_admin, marketing, sales to view and manage leads
CREATE POLICY "Staff can view marketing leads" ON public.marketing_leads FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

CREATE POLICY "Staff can insert marketing leads" ON public.marketing_leads FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

CREATE POLICY "Staff can update marketing leads" ON public.marketing_leads FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

CREATE POLICY "Staff can delete marketing leads" ON public.marketing_leads FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));
