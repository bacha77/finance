const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admins'`);
    console.log(res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
