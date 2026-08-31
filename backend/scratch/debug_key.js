const fs = require('fs');
const path = require('path');
const serviceAccount = require('../serviceAccountKey.json');

const key = serviceAccount.private_key;
console.log('--- KEY DEBUG ---');
console.log('Length:', key.length);
console.log('Starts with "-----BEGIN PRIVATE KEY-----":', key.startsWith('-----BEGIN PRIVATE KEY-----'));
console.log('Ends with "-----END PRIVATE KEY-----":', key.endsWith('-----END PRIVATE KEY-----'));
console.log('Number of actual newlines in string:', key.split('\n').length - 1);
console.log('Number of literal \\n in string:', key.split('\\n').length - 1);

// Write exact key string to a raw file so we can view it
fs.writeFileSync(path.join(__dirname, '../raw_private_key.pem'), key);
console.log('Saved raw private key to raw_private_key.pem for inspection.');
