const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  const res = await client.query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles'");
  console.log(res.rows);
  await client.end();
}
run();
