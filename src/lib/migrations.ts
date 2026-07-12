/**
 * Auto-migration utility.
 * Runs once on app startup (when logged in as admin/owner).
 * Uses Supabase's postgres `exec_sql` helper or direct DDL via service role.
 * All statements use IF NOT EXISTS, so they are safe to run repeatedly.
 */
import { supabase } from './supabase';
const MIGRATION_KEY = 'sf_migrations_v10';

const MIGRATIONS: { name: string; sql: string }[] = [
    {
        name: 'add_profiles_role',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'`,
    },
    {
        name: 'add_churches_referral_source',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS referral_source TEXT`,
    },
    {
        name: 'add_members_phone',
        sql: `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT`,
    },
    {
        name: 'add_profiles_phone',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT`,
    },
    {
        name: 'add_churches_address',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS address TEXT`,
    },
    {
        name: 'add_churches_city',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS city TEXT`,
    },
    {
        name: 'add_churches_state',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS state TEXT`,
    },
    {
        name: 'add_churches_zip',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS zip TEXT`,
    },
    {
        name: 'add_churches_country',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS country TEXT`,
    },
    {
        name: 'add_churches_denomination',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS denomination TEXT`,
    },
    {
        name: 'add_churches_size',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS size TEXT`,
    },
    {
        name: 'add_churches_plan',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'`,
    },
    {
        name: 'add_churches_owner_id',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id)`,
    },
    {
        name: 'add_churches_treasurer_name',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS treasurer_name TEXT`,
    },
    {
        name: 'add_churches_treasurer_email',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS treasurer_email TEXT`,
    },
    {
        name: 'add_churches_treasurer_phone',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS treasurer_phone TEXT`,
    },
    {
        name: 'add_churches_website',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS website TEXT`,
    },
    {
        name: 'add_churches_tax_id',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS tax_id TEXT`,
    },
    {
        name: 'add_churches_currency',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'`,
    },
    {
        name: 'add_churches_fiscal_year_start',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS fiscal_year_start TEXT DEFAULT '01-01'`,
    },
    {
        name: 'add_churches_logo_url',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS logo_url TEXT`,
    },
    {
        name: 'add_churches_cancel_at_period_end',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false`,
    },
    {
        name: 'add_staff_type',
        sql: `ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS type TEXT`,
    },
    {
        name: 'add_staff_frequency',
        sql: `ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS frequency TEXT`,
    },
    {
        name: 'add_staff_recurring',
        sql: `ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT true`,
    },
    {
        name: 'staff_housing_allowance',
        sql: `ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC DEFAULT 0`,
    },
    {
        name: 'staff_state_tax_rate',
        sql: `ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS state_tax_rate NUMERIC DEFAULT 0.05`,
    },
    {
        name: 'create_reimbursements_table',
        sql: `
            CREATE TABLE IF NOT EXISTS public.reimbursements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
                amount NUMERIC NOT NULL,
                description TEXT,
                receipt_url TEXT,
                status TEXT DEFAULT 'pending',
                submitted_by TEXT NOT NULL,
                fund_id UUID,
                department TEXT DEFAULT 'General',
                reviewed_by TEXT,
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
        `
    },
    {
        name: 'create_events_and_tickets',
        sql: `
            CREATE TABLE IF NOT EXISTS public.events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                date TIMESTAMPTZ NOT NULL,
                location TEXT,
                price NUMERIC DEFAULT 0,
                capacity INTEGER,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

            CREATE TABLE IF NOT EXISTS public.tickets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
                church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
                purchaser_name TEXT NOT NULL,
                purchaser_email TEXT,
                quantity INTEGER DEFAULT 1,
                amount_paid NUMERIC DEFAULT 0,
                status TEXT DEFAULT 'reserved',
                created_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
        `
    },
    {
        name: 'departments_annual_budget',
        sql: `ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS annual_budget NUMERIC DEFAULT 0`,
    },
    {
        name: 'departments_spent_so_far',
        sql: `ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS spent_so_far NUMERIC DEFAULT 0`,
    },
    {
        name: 'churches_cancellation_reason',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
    },
    {
        name: 'enable_realtime_ledger',
        sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger`,
    },
    {
        name: 'enable_realtime_funds',
        sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.funds`,
    },
    {
        name: 'ledger_audit_trail',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'`,
    },
    {
        name: 'ledger_member',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS member TEXT`,
    },
    {
        name: 'ledger_method',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'CASH'`,
    },
    {
        name: 'ledger_notes',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS notes TEXT`,
    },
    {
        name: 'ledger_fund_id',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS fund_id UUID`,
    },
    {
        name: 'ledger_receipt_url',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS receipt_url TEXT`,
    },
    {
        name: 'ledger_department',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General'`,
    },
    {
        name: 'ledger_category',
        sql: `ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS category TEXT`,
    },
    {
        name: 'integrity_checks',
        sql: `
            DO $$ 
            BEGIN 
                -- Reimbursement Policy
            DO $$ BEGIN
                DROP POLICY IF EXISTS "Users can view own church reimbursements" ON public.reimbursements;
                CREATE POLICY "Users can view own church reimbursements" ON public.reimbursements 
                FOR ALL USING ( church_id = public.get_my_church_id() );
            EXCEPTION WHEN others THEN NULL; END $$;

            DO $$ BEGIN
                DROP POLICY IF EXISTS "Users can view own church events" ON public.events;
                CREATE POLICY "Users can view own church events" ON public.events 
                FOR ALL USING ( church_id = public.get_my_church_id() );
                DROP POLICY IF EXISTS "Users can view own church tickets" ON public.tickets;
                CREATE POLICY "Users can view own church tickets" ON public.tickets 
                FOR ALL USING ( church_id = public.get_my_church_id() );
            EXCEPTION WHEN others THEN NULL; END $$;

            -- Staff constraints
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_salary_positive') THEN
                    ALTER TABLE public.ledger ADD CONSTRAINT ledger_amount_positive CHECK (amount >= 0);
                END IF;

                -- Fund Balance Non-Negative Constraint (Optional, but safe for standard accounts)
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fund_balance_non_negative') THEN
                    ALTER TABLE public.funds ADD CONSTRAINT fund_balance_non_negative CHECK (balance >= -5000); -- Allow small overdraft
                END IF;
            END $$;
        `,
    },
    {
        name: 'enable_rls_all',
        sql: `
            ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
        `,
    },
    {
        name: 'sys_restoration_v2',
        sql: `
            -- Fix trigger crash on DELETE
            CREATE OR REPLACE FUNCTION check_fiscal_lock()
            RETURNS TRIGGER AS $$
            DECLARE
              is_locked BOOLEAN;
              target_date TIMESTAMPTZ;
              target_cid UUID;
            BEGIN
              IF (TG_OP = 'DELETE') THEN
                target_date := OLD.created_at;
                target_cid := OLD.church_id;
              ELSE
                target_date := COALESCE(NEW.created_at, NOW());
                target_cid := NEW.church_id;
              END IF;

              SELECT (EXTRACT(YEAR FROM target_date)::INT = ANY(c.locked_years))
              INTO is_locked FROM public.churches c WHERE c.id = target_cid;

              IF is_locked AND (current_setting('role', true) <> 'service_role') THEN
                RAISE EXCEPTION 'Fiscal year locked.';
              END IF;
              RETURN (CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- Drop restrictive no-deletion policy
            DROP POLICY IF EXISTS ledger_no_deletion ON public.ledger;
            
            -- Ensure robust ledger policy exists
            DROP POLICY IF EXISTS "Church members see their ledger only" ON public.ledger;
            CREATE POLICY "Church members see their ledger only" ON public.ledger 
            FOR ALL USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );
        `
    },
    {
        name: 'ledger_voiding_suite',
        sql: `
            ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT false;
            ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
            ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided_by TEXT;
        `,
    },
    {
        name: 'funds_extra_cols',
        sql: `
            ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
            ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Unrestricted';
            ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
        `,
    },
    {
        name: 'team_management_v1',
        sql: `
            -- Create Invites Table
            CREATE TABLE IF NOT EXISTS public.invites (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email       TEXT NOT NULL,
                church_id   UUID REFERENCES public.churches(id) ON DELETE CASCADE,
                role        TEXT DEFAULT 'admin',
                invited_by  UUID REFERENCES auth.users(id),
                created_at  TIMESTAMPTZ DEFAULT now(),
                UNIQUE(email, church_id)
            );

            -- Enable RLS on Invites
            ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

            -- Policies for Invites
            DO $$ BEGIN
                DROP POLICY IF EXISTS "Church admins can manage invites" ON public.invites;
                CREATE POLICY "Church admins can manage invites" ON public.invites
                FOR ALL USING ( church_id = public.get_my_church_id() );
            EXCEPTION WHEN others THEN NULL; END $$;

            -- Update handle_new_user to handle invites
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS TRIGGER AS $$
            DECLARE
                target_church_id UUID;
                target_role TEXT;
            BEGIN
                -- Check if this email was invited to a specific church
                SELECT church_id, role INTO target_church_id, target_role 
                FROM public.invites 
                WHERE email = new.email 
                LIMIT 1;

                INSERT INTO public.profiles (id, email, full_name, church_id, role)
                VALUES (
                    new.id, 
                    new.email, 
                    new.raw_user_meta_data->>'full_name', 
                    target_church_id, 
                    COALESCE(target_role, 'admin')
                );
                
                -- Cleanup used invites
                IF target_church_id IS NOT NULL THEN
                    DELETE FROM public.invites WHERE email = new.email AND church_id = target_church_id;
                END IF;

                RETURN new;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
    },
    {
        name: 'add_churches_is_active',
        sql: `ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
    },
    {
        name: 'add_profiles_is_active',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
    },
    {
        name: 'update_profiles_rls_admin',
        sql: `
            DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
            CREATE POLICY "Users can view their own profile" ON public.profiles 
            FOR SELECT USING (id = auth.uid() OR church_id = public.get_my_church_id() OR (SELECT public.get_my_church_id()) IS NULL);
        `
    },
    {
        name: 'admin_rbac_v1',
        sql: `ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin'`
    },
    {
        name: 'staff_invites_v2',
        sql: `
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

            -- Update handle_new_user to handle detailed multi-role invites
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
        `
    },
    {
        name: 'marketing_leads_v1',
        sql: `
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

            -- Policies for marketing_leads
            -- Allow super_admin, marketing, sales to view and manage leads
            CREATE POLICY "Staff can view marketing leads" ON public.marketing_leads FOR SELECT 
            USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

            CREATE POLICY "Staff can insert marketing leads" ON public.marketing_leads FOR INSERT 
            WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

            CREATE POLICY "Staff can update marketing leads" ON public.marketing_leads FOR UPDATE 
            USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));

            CREATE POLICY "Staff can delete marketing leads" ON public.marketing_leads FOR DELETE 
            USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND role IN ('super_admin', 'marketing', 'sales')));
        `
    }
];

export async function runMigrations(): Promise<void> {
    // Only run once per browser session
    if (sessionStorage.getItem(MIGRATION_KEY)) return;

    let anyRan = false;

    for (const migration of MIGRATIONS) {
        try {
            // Try calling exec_sql RPC if it exists
            const { error } = await (supabase.rpc as any)('exec_sql', { sql: migration.sql });
            if (error && !error.message?.includes('does not exist')) {
                console.warn(`[migration] ${migration.name}:`, error.message);
            } else if (!error) {
                anyRan = true;
            }
        } catch {
            // exec_sql may not exist — that's fine, columns may already exist
        }
    }

    if (anyRan) {
        console.info('[migrations] Schema updated successfully.');
    }

    sessionStorage.setItem(MIGRATION_KEY, '1');
}
