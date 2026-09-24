const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    const res = await client.query("SELECT current_setting('app.settings.jwt_secret', true)");
    console.log(res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
