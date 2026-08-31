const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
    const rawKey = fs.readFileSync(path.join(__dirname, '../raw_private_key.pem'), 'utf8');
    console.log('Raw Key Length:', rawKey.length);
    
    // Try to parse using Node's crypto
    const parsedKey = crypto.createPrivateKey({
        key: rawKey,
        format: 'pem',
        type: 'pkcs8'
    });
    console.log('✅ Node crypto successfully parsed the private key!');
} catch (e) {
    console.error('❌ Node crypto failed to parse the private key:', e.message);
}
