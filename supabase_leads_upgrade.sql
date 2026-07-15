-- Add missing columns to marketing_leads
ALTER TABLE public.marketing_leads 
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;

-- Insert a sample church lead from Columbus, OH
INSERT INTO public.marketing_leads (church_name, contact_name, email, phone, status, source, estimated_value, follow_up_date)
VALUES (
    'Vineyard Columbus',
    'Senior Administrator',
    'hello@vineyardcolumbus.org',
    '(614) 890-0000',
    'New',
    'Cold Outreach',
    199.00,
    timezone('utc'::text, now() + interval '3 days')
);

INSERT INTO public.marketing_leads (church_name, contact_name, email, phone, status, source, estimated_value, follow_up_date)
VALUES (
    'Rock City Church',
    'Financial Secretary',
    'info@rockcitychurch.tv',
    '(614) 859-9064',
    'Contacted',
    'Cold Outreach',
    99.00,
    timezone('utc'::text, now() + interval '5 days')
);
