const http = require('http');

const data = JSON.stringify({
  fullName: "Test Ad User",
  company: "Test Ad Company",
  phone: "+918888888888",
  email: "testad@example.com",
  category: "Seeds",
  message: "Test message for ads proposal"
});

const options = {
  hostname: 'localhost',
  port: 5500,
  path: '/api/ads/submit',
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
