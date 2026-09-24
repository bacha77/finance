const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  
  const sql = `
    -- Drop constraints referencing profiles.id
    ALTER TABLE system_logs DROP CONSTRAINT IF EXISTS system_logs_user_id_fkey;
    ALTER TABLE referral_claims DROP CONSTRAINT IF EXISTS referral_claims_employee_id_fkey;
    
    -- Alter columns
    ALTER TABLE profiles ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;
    
    ALTER TABLE admins ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE admins ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    ALTER TABLE audit_logs ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE audit_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    
    ALTER TABLE system_logs ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE system_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    ALTER TABLE referral_claims ALTER COLUMN employee_id DROP DEFAULT;
    ALTER TABLE referral_claims ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;

    -- Re-add constraints
    ALTER TABLE system_logs ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
    ALTER TABLE referral_claims ADD CONSTRAINT referral_claims_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES profiles(id);
  `;
  
  try {
    await client.query(sql);
    console.log('Successfully altered columns to TEXT!');
  } catch (err) {
    console.error('Error altering tables:', err);
  }
  
  await client.end();
}
run();
