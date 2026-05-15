-- ============================================================
-- STOREHOUSE FINANCE — RBAC Hardening (SQL Layer)
-- Purpose: Enforce role-based access at the database level
-- Roles: 'admin' (Main), 'assistant' (Assistant), 'viewer' (Viewer)
-- ============================================================

-- 1. Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(target_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role ILIKE '%' || target_role || '%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check if user is a treasurer (admin or assistant)
CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role ILIKE '%admin%' OR role ILIKE '%assistant%')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RE-DEFINING POLICIES (DROP OLD ONES FIRST)
-- ============================================================

-- LEDGER
DROP POLICY IF EXISTS "Church members see their ledger only" ON public.ledger;

CREATE POLICY "Ledger: Read-only for all members" 
    ON public.ledger FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Ledger: Write for Treasurers" 
    ON public.ledger FOR INSERT 
    WITH CHECK (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Ledger: Update for Treasurers" 
    ON public.ledger FOR UPDATE 
    USING (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Ledger: Delete (Void) for Main Treasurer only" 
    ON public.ledger FOR DELETE 
    USING (church_id = public.get_my_church_id() AND public.has_role('admin'));


-- FUNDS
DROP POLICY IF EXISTS "Church members see their funds only" ON public.funds;

CREATE POLICY "Funds: Read-only for all members" 
    ON public.funds FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Funds: Write/Update for Treasurers" 
    ON public.funds FOR ALL 
    USING (church_id = public.get_my_church_id() AND public.is_treasurer());


-- MEMBERS
DROP POLICY IF EXISTS "Church members see their congregation only" ON public.members;

CREATE POLICY "Members: Read-only for all members" 
    ON public.members FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Members: Write/Update for Treasurers" 
    ON public.members FOR INSERT 
    WITH CHECK (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Members: Update for Treasurers" 
    ON public.members FOR UPDATE 
    USING (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Members: Delete for Main Treasurer only" 
    ON public.members FOR DELETE 
    USING (church_id = public.get_my_church_id() AND public.has_role('admin'));


-- STAFF (PAYROLL)
DROP POLICY IF EXISTS "Church members see their staff only" ON public.staff;

CREATE POLICY "Staff: Read-only for all members" 
    ON public.staff FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Staff: Write/Update for Treasurers" 
    ON public.staff FOR INSERT 
    WITH CHECK (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Staff: Update for Treasurers" 
    ON public.staff FOR UPDATE 
    USING (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Staff: Delete for Main Treasurer only" 
    ON public.staff FOR DELETE 
    USING (church_id = public.get_my_church_id() AND public.has_role('admin'));


-- DEPARTMENTS
DROP POLICY IF EXISTS "Church members see their departments only" ON public.departments;

CREATE POLICY "Departments: Read-only for all members" 
    ON public.departments FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Departments: Write/Update for Treasurers" 
    ON public.departments FOR ALL 
    USING (church_id = public.get_my_church_id() AND public.is_treasurer());


-- DOCUMENTS (VAULT)
DROP POLICY IF EXISTS "Church Docs Access" ON public.documents;

CREATE POLICY "Documents: Read-only for all members" 
    ON public.documents FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Documents: Write for Treasurers" 
    ON public.documents FOR INSERT 
    WITH CHECK (church_id = public.get_my_church_id() AND public.is_treasurer());

CREATE POLICY "Documents: Delete for Main Treasurer only" 
    ON public.documents FOR DELETE 
    USING (church_id = public.get_my_church_id() AND public.has_role('admin'));

-- ============================================================
-- PROFILES (Team Management)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles: View team members in same church" 
    ON public.profiles FOR SELECT 
    USING (church_id = public.get_my_church_id());

CREATE POLICY "Profiles: Update own profile" 
    ON public.profiles FOR UPDATE 
    USING (id = auth.uid());

-- NOTE: Insert for profiles is usually handled by the auth trigger, 
-- but we allow users to insert their own during setup.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Profiles: Insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (id = auth.uid());

-- ============================================================
-- FINISHED ✅
-- These policies ensure that Viewers cannot modify data, 
-- Assistants can handle operations, and only the Main Treasurer 
-- can perform destructive actions (Delete/Void).
-- ============================================================
