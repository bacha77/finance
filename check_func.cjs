const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    const res = await client.query("SELECT pg_get_functiondef('requesting_user_id'::regproc)");
    console.log(res.rows[0].pg_get_functiondef);
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
