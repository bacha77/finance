const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  
  try {
    const res = await client.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid AS $$
        SELECT NULLIF(
          COALESCE(
            current_setting('request.jwt.claim.supabase_uuid', true),
            current_setting('request.jwt.claim.sub', true)
          ), 
          ''
        )::uuid;
      $$ LANGUAGE SQL STABLE;
    `);
    console.log('Successfully redefined auth.uid()!', res);
  } catch (err) {
    console.error('Failed to redefine auth.uid():', err);
  }
  
  await client.end();
}
run();
