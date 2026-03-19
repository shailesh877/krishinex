const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello, World!');
});
server.listen(5500, '0.0.0.0', () => {
  console.log('Test server listening on port 5500');
});
server.on('error', (err) => {
  console.error('Test server error:', err);
});
