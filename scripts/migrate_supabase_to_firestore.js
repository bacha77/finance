import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'storehouse-finance-app',
  appId: process.env.VITE_FIREBASE_APP_ID,
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TABLES = [
  'churches',
  'profiles',
  'members',
  'funds',
  'departments',
  'ledger',
  'payroll',
  'expenses',
  'reimbursements',
  'events',
  'budgets',
  'documents',
  'admins',
  'admin_payments',
  'marketing_leads',
  'system_invites',
];

async function migrateTable(tableName) {
  console.log(`\n--- Migrating [${tableName}] ---`);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.warn(`Could not read [${tableName}] from Supabase:`, error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.log(`Table [${tableName}] is empty. Skipping.`);
    return;
  }

  console.log(`Found ${data.length} records in [${tableName}]. Writing to Firestore...`);
  let count = 0;
  for (const row of data) {
    const docId = String(row.id || row.email || crypto.randomUUID());
    const cleanRow = { ...row };
    Object.keys(cleanRow).forEach((k) => cleanRow[k] === undefined && delete cleanRow[k]);
    await setDoc(doc(db, tableName, docId), cleanRow, { merge: true });
    count++;
  }
  console.log(`Successfully migrated ${count} records into Firestore collection '${tableName}'.`);
}

async function run() {
  console.log('Starting Supabase -> Firestore Migration for Storehouse Finance...');
  for (const table of TABLES) {
    try {
      await migrateTable(table);
    } catch (err) {
      console.error(`Error on table ${table}:`, err.message);
    }
  }
  console.log('\nMigration complete! All collections synchronized with Firestore.');
  process.exit(0);
}

run();

