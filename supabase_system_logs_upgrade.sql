-- Upgrade system_logs for Multi-tenancy
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

-- Optional: You can create a policy so users can only see logs for their church
-- ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read system logs for their church"
--     ON public.system_logs FOR SELECT
--     USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));
