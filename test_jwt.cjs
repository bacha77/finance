const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const jwt = 'eyJhbGciOiJIUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsInR5cCI6IkpXVCJ9.eyJhcHBfbWV0YWRhdGEiOnt9LCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZW1haWwiOiJiYWNoYTdAZ21haWwuY29tIiwiZXhwIjoxNzkwMjg5NzYxLCJpYXQiOjE3OTAyODk3MDEsImlzcyI6Imh0dHBzOi8vcmVsYXhpbmctYXJhY2huaWQtNDg5OS5jbGVyay5hY2NvdW50cy5kZXYiLCJqdGkiOiIxNmJjZTNhZDM3MGUxODVlMzhjNiIsIm5iZiI6MTc5MDI4OTY5Niwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJ1c2VyXzNKaThteVlrQVVkZ2FpbXBJeTU4QXlmYXhUWSIsInN1cGFiYXNlX3V1aWQiOiJhNTQ0MjkzZi00MWExLTQzN2MtYmQ5NS1lMTU5M2ViMmY0MTMiLCJ1c2VyX21ldGFkYXRhIjp7fX0.15uEUkj-1UljH4GUPn1XCjy3EaOKYHbGi3QmTdMfL_w';
  
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  try {
    // Set role to authenticated and pass the JWT
    await client.query(`set local role authenticated`);
    await client.query(`set local request.jwt.claim.supabase_uuid = 'a544293f-41a1-437c-bd95-e1593eb2f413'`);
    const res = await client.query(`SELECT requesting_user_id()`);
    console.log("requesting_user_id():", res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await client.end();
}
run();
