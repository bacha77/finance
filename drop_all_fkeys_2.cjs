const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT conname, relname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);
    for (const row of res.rows) {
      console.log(`Dropping ${row.conname} from ${row.relname}`);
      await client.query(`ALTER TABLE public."${row.relname}" DROP CONSTRAINT "${row.conname}"`);
    }
    console.log("Done");
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
