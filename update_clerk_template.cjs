const secret = 'sk_test_7r6AQIg8YRXGNgrBGMrrxs9u8YdJO2r8RWPST1XA16';

const updateClaims = {
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}",
  "supabase_uuid": "{{user.unsafe_metadata.supabase_uuid}}",
  "app_metadata": {},
  "user_metadata": {}
};

fetch('https://api.clerk.com/v1/jwt_templates/jtmp_3JkWWbK7I0C3rFEFILvs18UcRuI', {
  method: 'PATCH',
  headers: { 
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'supabase', claims: updateClaims })
})
.then(res => res.json())
.then(data => console.log('Updated Template:', JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
