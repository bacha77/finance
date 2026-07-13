ALTER TABLE public.marketing_leads 
ADD COLUMN estimated_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN follow_up_date TIMESTAMP WITH TIME ZONE;
