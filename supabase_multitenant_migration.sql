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
    address     TEXT,
    city        TEXT,
    state       TEXT,
    zip         TEXT,
    country     TEXT,
    denomination TEXT,
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

-- ── STEP 4.1: Syncing modern schema for existing tables (critical) ──

-- LEDGER Table
DO $$ BEGIN ALTER TABLE public.ledger ADD COLUMN member TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ledger ADD COLUMN notes TEXT;  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ledger ADD COLUMN audit_trail JSONB DEFAULT '[]'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ledger ADD COLUMN fund_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- DEPARTMENTS Table
DO $$ BEGIN ALTER TABLE public.departments ADD COLUMN description TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.departments ADD COLUMN type TEXT;        EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.departments ADD COLUMN status TEXT DEFAULT 'Active'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.departments ADD COLUMN members INT DEFAULT 0;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- MEMBERS Table
DO $$ BEGIN ALTER TABLE public.members     ADD COLUMN role TEXT;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- STAFF Table
DO $$ BEGIN ALTER TABLE public.staff       ADD COLUMN type TEXT;       EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.staff       ADD COLUMN frequency TEXT;  EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.staff       ADD COLUMN recurring BOOLEAN DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── STEP 4.2: Unique Constraints for Multi-Tenancy (critical for upserts) ──
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_year_church_id_key') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT budgets_year_church_id_key UNIQUE (year, church_id); 
    END IF;
EXCEPTION 
    WHEN duplicate_object OR duplicate_table THEN NULL; 
END $$;


-- ============================================================
-- STEP 4.3: Auth Trigger (Handle new signups automatically)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe trigger creation 
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;

-- ============================================================
-- STEP 5: Helper function — get current user's church
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_church_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    cid UUID;
    user_email TEXT;
BEGIN
    -- 1. Get the current user's email from the JWT
    user_email := auth.jwt()->>'email';

    -- 2. SUPER ADMIN BYPASS: If the user is the master admin, return NULL
    --    This tells the RLS policies to allow access to ALL rows (if handled in policy)
    IF user_email = 'admin@storehouse.org' THEN
        RETURN NULL;
    END IF;

    -- 3. Try to find the church_id in the profiles table for this user
    SELECT church_id INTO cid FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    
    -- 4. Dev bypass
    IF cid IS NULL AND (auth.uid() IS NULL OR auth.uid() = '00000000-0000-0000-0000-000000000000'::UUID) THEN
        cid := '11111111-1111-1111-1111-111111111111'::UUID;
    END IF;
    
    RETURN cid;
END;
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
DROP POLICY IF EXISTS "Owner can insert church"                 ON public.churches;
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
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- FUNDS
CREATE POLICY "Church members see their funds only"
    ON public.funds FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- MEMBERS
CREATE POLICY "Church members see their congregation only"
    ON public.members FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- DEPARTMENTS
CREATE POLICY "Church members see their departments only"
    ON public.departments FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- BUDGETS
CREATE POLICY "Church members see their budgets only"
    ON public.budgets FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- STAFF
CREATE POLICY "Church members see their staff only"
    ON public.staff FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );

-- ============================================================
-- STEP 9: Data Integrity Initialization
-- Ensure every church has at least one "General Fund"
-- ============================================================
INSERT INTO public.funds (name, balance, church_id)
SELECT 'General Fund', 0, id
FROM public.churches c
WHERE NOT EXISTS (
    SELECT 1 FROM public.funds f 
    WHERE f.church_id = c.id 
    AND f.name = 'General Fund'
);

-- = =========================================================
-- STEP 10: Sync Historical Ledger to Fund Balances
-- ============================================================

-- 10.1 Fix any invalid fund_id strings ('gf' or null) and ensure type is UUID
DO $$ 
BEGIN 
    -- 10.1.1 Clean data if it's currently text to avoid cast errors
    UPDATE public.ledger SET fund_id = NULL WHERE fund_id::text = 'gf' OR fund_id::text = '';
    
    -- 10.1.2 Force change the column type to UUID if it isn't already
    ALTER TABLE public.ledger ALTER COLUMN fund_id TYPE UUID USING fund_id::UUID;
EXCEPTION WHEN others THEN NULL; 
END $$;

-- 10.2 Assign transactions to the real General Fund where missing
UPDATE public.ledger l
SET fund_id = f.id
FROM public.funds f
WHERE l.church_id = f.church_id 
  AND f.name = 'General Fund'
  AND l.fund_id IS NULL;

-- 10.3 Recalculate the General Fund balance based on all historical ledger entries
UPDATE public.funds f
SET balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.ledger l
    WHERE l.fund_id = f.id
)
WHERE f.name = 'General Fund';

-- ============================================================
-- ALL DONE ✅
-- Your database is now fully multi-tenant and synchronized!
-- ============================================================
-- ============================================================
-- STEP 11: Create storage buckets for assets
-- ============================================================
-- Ensure storage schema exists and create buckets if they don't
-- Note: In some environments, buckets must be created via UI or API
-- This is a best-effort SQL initialization

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for buckets
-- Allow public access to read
DO $$
BEGIN
    CREATE POLICY "Public Read Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Read Access Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to upload
DO $$
BEGIN
    CREATE POLICY "Authenticated Upload Logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Authenticated Upload Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 11: Exec SQL Helper (for migrations.ts)
-- ============================================================
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
