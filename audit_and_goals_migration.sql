-- ============================================================
-- STOREHOUSE FINANCE — Phase 1: Integrity Core Migration
-- Includes Audit Logs and Multi-Goal Tracking
-- ============================================================

-- 1. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT NOT NULL,
    record_id   UUID NOT NULL,
    action      TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data    JSONB,
    new_data    JSONB,
    user_id     UUID REFERENCES auth.users(id),
    church_id   UUID REFERENCES public.churches(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Goals table for Multi-Goal Tracking
CREATE TABLE IF NOT EXISTS public.goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    color       TEXT DEFAULT '#2563eb',
    icon        TEXT DEFAULT 'Target',
    status      TEXT DEFAULT 'active', -- active, completed, paused
    church_id   UUID REFERENCES public.churches(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Add 'month_locked' to ledger (for fiscal integrity)
DO $$
BEGIN
    ALTER TABLE public.ledger ADD COLUMN is_locked BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals      ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Church members see their audit logs"
    ON public.audit_logs FOR SELECT
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Church members see their goals"
    ON public.goals FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- 6. Pre-populate initial goal if needed (Building Fund)
-- This assumes the user will run this in Supabase SQL editor.
