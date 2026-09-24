const secret = 'sk_test_7r6AQIg8YRXGNgrBGMrrxs9u8YdJO2r8RWPST1XA16';

async function run() {
  const res = await fetch('https://api.clerk.com/v1/sessions?user_id=user_3Ji8myYkAUdgaimpIy58AyfaxTY', {
    headers: { Authorization: `Bearer ${secret}` }
  });
  const data = await res.json();
  const sessionId = data[0].id;
  
  const tokenRes = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}/tokens/supabase`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  });
  const tokenData = await tokenRes.json();
  console.log(tokenData);
}
run();
