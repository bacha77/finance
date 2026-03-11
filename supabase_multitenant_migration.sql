-- ============================================================
-- STOREHOUSE FINANCE — Multi-Tenant Migration (Safe Version)
-- Handles tables that may or may not already exist
-- Run in: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ============================================================
-- STEP 1: Create churches table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.churches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    city        TEXT,
    state       TEXT,
    size        TEXT,
    plan        TEXT DEFAULT 'trial',
    owner_id    UUID REFERENCES auth.users(id),
    treasurer_name TEXT,
    treasurer_email TEXT,
    treasurer_phone TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 2: Create profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    church_id   UUID,
    role        TEXT DEFAULT 'admin',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add FK constraint safely (ignore if already exists)
DO $$
BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_church_id_fkey
        FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 3: Create core tables if they don't exist yet
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ledger (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date        TEXT,
    description TEXT,
    amount      NUMERIC DEFAULT 0,
    type        TEXT,
    fund        TEXT,
    category    TEXT,
    department  TEXT,
    method      TEXT,
    receipt_url TEXT,
    church_id   UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    balance     NUMERIC DEFAULT 0,
    type        TEXT,
    church_id   UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT,
    email       TEXT,
    phone       TEXT,
    status      TEXT DEFAULT 'active',
    join_date   TEXT,
    tithe_total NUMERIC DEFAULT 0,
    church_id   UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    head        TEXT,
    budget      NUMERIC DEFAULT 0,
    church_id   UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year         INT,
    total_budget NUMERIC DEFAULT 0,
    allocations  JSONB,
    church_id    UUID,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    role        TEXT,
    salary      NUMERIC DEFAULT 0,
    status      TEXT DEFAULT 'active',
    last_paid   TEXT,
    church_id   UUID,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 4: Add church_id to existing tables (safe)
-- ============================================================
DO $$
BEGIN
    ALTER TABLE public.ledger      ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.funds       ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.members     ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.departments ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.budgets     ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.staff       ADD COLUMN church_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- STEP 5: Helper function — get current user's church
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_church_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT church_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- STEP 6: Enable Row Level Security
-- ============================================================
ALTER TABLE public.churches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: Drop old policies first (safe re-run)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own church"         ON public.churches;
DROP POLICY IF EXISTS "Owner can update their church"           ON public.churches;
DROP POLICY IF EXISTS "Users can view their own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Church members see their ledger only"    ON public.ledger;
DROP POLICY IF EXISTS "Church members see their funds only"     ON public.funds;
DROP POLICY IF EXISTS "Church members see their congregation only" ON public.members;
DROP POLICY IF EXISTS "Church members see their departments only" ON public.departments;
DROP POLICY IF EXISTS "Church members see their budgets only"   ON public.budgets;
DROP POLICY IF EXISTS "Church members see their staff only"     ON public.staff;

-- ============================================================
-- STEP 8: Create RLS Policies
-- ============================================================

-- CHURCHES
CREATE POLICY "Users can view their own church"
    ON public.churches FOR SELECT
    USING (id = public.get_my_church_id() OR owner_id = auth.uid());

CREATE POLICY "Owner can update their church"
    ON public.churches FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Owner can insert church"
    ON public.churches FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- PROFILES
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR church_id = public.get_my_church_id());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- LEDGER
CREATE POLICY "Church members see their ledger only"
    ON public.ledger FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- FUNDS
CREATE POLICY "Church members see their funds only"
    ON public.funds FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- MEMBERS
CREATE POLICY "Church members see their congregation only"
    ON public.members FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- DEPARTMENTS
CREATE POLICY "Church members see their departments only"
    ON public.departments FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- BUDGETS
CREATE POLICY "Church members see their budgets only"
    ON public.budgets FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- STAFF
CREATE POLICY "Church members see their staff only"
    ON public.staff FOR ALL
    USING (church_id = public.get_my_church_id())
    WITH CHECK (church_id = public.get_my_church_id());

-- ============================================================
-- ALL DONE ✅
-- Your database is now fully multi-tenant!
-- ============================================================
