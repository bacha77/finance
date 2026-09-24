const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    await client.query(`
      INSERT INTO admins (user_id, email, role) 
      VALUES ('a544293f-41a1-437c-bd95-e1593eb2f413', 'bacha7@gmail.com', 'superadmin')
      ON CONFLICT DO NOTHING;
    `);
    console.log("Made user an admin!");
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
