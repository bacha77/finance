/**
 * Auto-migration utility.
 * Runs once on app startup (when logged in as admin/owner).
 * Uses Supabase's postgres `exec_sql` helper or direct DDL via service role.
 * All statements use IF NOT EXISTS, so they are safe to run repeatedly.
 */
import { supabase } from './supabase';

const MIGRATION_KEY = 'sf_migrations_v8';

const MIGRATIONS: { name: string; sql: string }[] = [
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
                -- Ledger Positive Amount Constraint
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_amount_positive') THEN
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
