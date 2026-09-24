const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  
  const sql = `
    SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public';
  `;
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
  
  await client.end();
}
run();
