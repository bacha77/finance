const secret = 'sk_test_7r6AQIg8YRXGNgrBGMrrxs9u8YdJO2r8RWPST1XA16';

fetch('https://api.clerk.com/v1/users', {
  headers: { 'Authorization': `Bearer ${secret}` }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
