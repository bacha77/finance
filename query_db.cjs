const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type = 'uuid' 
      AND (column_name = 'id' OR column_name LIKE '%user%_id%' OR column_name LIKE '%admin%_id%');
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();
