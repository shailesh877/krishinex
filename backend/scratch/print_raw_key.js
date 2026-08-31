const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

console.log('--- RAW KEY BYTE INSPECTOR ---');
console.log('Raw Key Length:', serviceAccount.private_key.length);
console.log('Starts with -----BEGIN PRIVATE KEY-----:', serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----'));
console.log('Ends with -----END PRIVATE KEY-----:', serviceAccount.private_key.trim().endsWith('-----END PRIVATE KEY-----'));

// Let's print the first 200 characters and check for any backslashes or literal \n
console.log('\nFirst 200 characters:');
console.log(JSON.stringify(serviceAccount.private_key.substring(0, 200)));

// Let's print the last 200 characters
console.log('\nLast 200 characters:');
console.log(JSON.stringify(serviceAccount.private_key.substring(serviceAccount.private_key.length - 200)));

// Let's check how many actual newline characters are inside the string
const newlineCount = (serviceAccount.private_key.match(/\n/g) || []).length;
console.log('\nActual \\n count:', newlineCount);

// Let's check if there are any literal '\\n' sequences (two characters: backslash + n)
const literalBackslashNCount = (serviceAccount.private_key.match(/\\n/g) || []).length;
console.log('Literal \\\\n count:', literalBackslashNCount);
