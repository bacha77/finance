const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').insert({ id: '00000000-0000-0000-0000-000000000000', email: 'test@test.com' });
  console.log(error ? 'Error: ' + error.message : 'OK');
}
test();
