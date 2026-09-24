const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS uuid AS $$
        SELECT NULLIF(
          (auth.jwt() ->> 'supabase_uuid'), 
        '')::uuid;
      $$ LANGUAGE sql STABLE;
    `);
    console.log("Updated function requesting_user_id to use auth.jwt()");
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
