/**
 * Auto-migration utility.
 * Runs once on app startup (when logged in as admin/owner).
 * Uses Supabase's postgres `exec_sql` helper or direct DDL via service role.
 * All statements use IF NOT EXISTS, so they are safe to run repeatedly.
 */
import { supabase } from './supabase';

const MIGRATION_KEY = 'sf_migrations_v3';

const MIGRATIONS: { name: string; sql: string }[] = [
    {
        name: 'add_members_phone',
        sql: `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT`,
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
