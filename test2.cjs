const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('system_invites').select('first_name, last_name, phone, roles').limit(1);
  console.log(error ? 'Error: ' + error.message : 'system_invites OK');
}
test();
