const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  try {
    // 1. Create the new requesting_user_id function
    await client.query(`
      CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS uuid AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.supabase_uuid', true), '')::uuid;
      $$ LANGUAGE sql STABLE;
    `);

    // 2. Update get_my_church_id to use the new function
    await client.query(`
      CREATE OR REPLACE FUNCTION get_my_church_id() RETURNS uuid AS $$
        SELECT church_id FROM profiles WHERE id = requesting_user_id();
      $$ LANGUAGE sql SECURITY DEFINER;
    `);

    // 3. Fetch all policies
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);

    // 4. Drop and recreate policies containing auth.uid()
    for (const p of res.rows) {
      if ((p.qual && p.qual.includes('auth.uid()')) || (p.with_check && p.with_check.includes('auth.uid()'))) {
        console.log(`Recreating policy: ${p.policyname} on ${p.tablename}`);
        
        // Drop the old policy
        await client.query(`DROP POLICY "${p.policyname}" ON "${p.tablename}";`);
        
        // Prepare the new definition
        const newQual = p.qual ? p.qual.replace(/auth\.uid\(\)/g, 'requesting_user_id()') : null;
        const newWithCheck = p.with_check ? p.with_check.replace(/auth\.uid\(\)/g, 'requesting_user_id()') : null;
        
        const rolesStr = typeof p.roles === 'string' ? p.roles.replace(/[{}]/g, '') : p.roles[0];
        let createSql = `CREATE POLICY "${p.policyname}" ON "${p.tablename}" FOR ${p.cmd} TO ${rolesStr}`;
        if (newQual) createSql += ` USING (${newQual})`;
        if (newWithCheck) createSql += ` WITH CHECK (${newWithCheck})`;
        
        await client.query(createSql);
      }
    }
    console.log('Successfully updated policies!');
  } catch (err) {
    console.error('Error updating policies:', err);
  }
  
  await client.end();
}
run();
