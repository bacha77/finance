const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('admins').insert({ user_id: '00000000-0000-0000-0000-000000000000', role: 'super_admin' });
  console.log(error ? 'Error: ' + error.message : 'OK');
}
test();
