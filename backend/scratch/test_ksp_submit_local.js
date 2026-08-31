const http = require('http');

const data = JSON.stringify({
  fullName: "Test Local User",
  shopName: "Test Local Shop",
  phone: "+919999999999",
  email: "testlocal@example.com",
  address: "123 Local St",
  city: "Varanasi",
  state: "Uttar Pradesh",
  pin: "221001"
});

const options = {
  hostname: 'localhost',
  port: 5500,
  path: '/api/ksp/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
