const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').select('id, email, full_name, phone, church_id, role').limit(1);
  console.log(error ? 'Profiles Error: ' + error.message : 'Profiles schema OK');
  
  const { data: d2, error: e2 } = await supabase.from('admins').select('user_id, role').limit(1);
  console.log(e2 ? 'Admins Error: ' + e2.message : 'Admins schema OK');
}
test();
