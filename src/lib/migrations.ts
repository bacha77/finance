/**
 * Auto-migration utility.
 * Firestore is schema-less; SQL migrations are not applicable.
 */
const MIGRATION_KEY = 'sf_migrations_v10';

export async function runMigrations(): Promise<void> {
    sessionStorage.setItem(MIGRATION_KEY, '1');
    return;
}
