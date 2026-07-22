const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
            ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT true;
            ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS auto_receipts BOOLEAN DEFAULT false;
            ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
            ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{}';
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error && !error.message.includes('does not exist')) {
    console.error('Error running migration:', error);
  } else {
    console.log('Migration ran successfully');
  }
}
run();
