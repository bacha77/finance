-- ============================================================
-- STOREHOUSE FINANCE — Multi-Tenant Database Schema
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================

-- 1. CHURCHES TABLE
-- One row per church (one tenant)
CREATE TABLE IF NOT EXISTS public.churches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    city        TEXT,
    state       TEXT,
    size        TEXT,  -- small | medium | large | mega
    plan        TEXT DEFAULT 'trial',  -- trial | starter | growth | enterprise
    owner_id    UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE
-- Links a Supabase Auth user to their church and role
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    church_id   UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    role        TEXT DEFAULT 'admin',  -- admin | staff | viewer
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. ADD church_id TO ALL EXISTING TABLES
-- (Only run if you haven't already — these are safe to run with IF NOT EXISTS)

ALTER TABLE public.ledger
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

ALTER TABLE public.funds
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

ALTER TABLE public.staff
    ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- This is what makes multi-tenancy SECURE.
-- Each user can ONLY see & edit their own church's data.
-- ============================================================

-- Helper function: get the current user's church_id
CREATE OR REPLACE FUNCTION public.get_my_church_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT church_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.churches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff       ENABLE ROW LEVEL SECURITY;

-- CHURCHES policies
CREATE POLICY "Users can view their own church"
    ON public.churches FOR SELECT
    USING (id = public.get_my_church_id() OR owner_id = auth.uid());

CREATE POLICY "Owner can update their church"
    ON public.churches FOR UPDATE
    USING (owner_id = auth.uid());

-- PROFILES policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR church_id = public.get_my_church_id());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- LEDGER policies
CREATE POLICY "Church members see their ledger only"
    ON public.ledger FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- FUNDS policies
CREATE POLICY "Church members see their funds only"
    ON public.funds FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- MEMBERS policies
CREATE POLICY "Church members see their congregation only"
    ON public.members FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- DEPARTMENTS policies
CREATE POLICY "Church members see their departments only"
    ON public.departments FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- BUDGETS policies
CREATE POLICY "Church members see their budgets only"
    ON public.budgets FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- STAFF policies
CREATE POLICY "Church members see their staff only"
    ON public.staff FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- ============================================================
-- Done! Your database is now multi-tenant.
-- ============================================================
