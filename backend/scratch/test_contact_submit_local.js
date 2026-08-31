const http = require('http');

const data = JSON.stringify({
  name: "Test Contact User",
  phone: "+917777777777",
  email: "testcontact@example.com",
  subject: "General Enquiry",
  message: "Test message for contact request"
});

const options = {
  hostname: 'localhost',
  port: 5500,
  path: '/api/contact/submit',
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
