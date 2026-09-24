const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    `);
    console.log("Successfully dropped profiles_id_fkey");
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
