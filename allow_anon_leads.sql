CREATE POLICY "Allow anonymous insert into marketing_leads" 
ON public.marketing_leads 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);
