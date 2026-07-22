import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT true;`;
    await sql`ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS auto_receipts BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{}';`;
    console.log('Migration ran successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await sql.end();
  }
}
run();
