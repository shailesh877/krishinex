require('dotenv').config({ path: 'd:/khetify/backend/.env' });
const FIREBASE_CONFIG = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!FIREBASE_CONFIG) {
    console.error('FIREBASE_SERVICE_ACCOUNT not found in .env');
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(FIREBASE_CONFIG);
    let key = serviceAccount.private_key;
    console.log('Original Key Starts With:', key.substring(0, 30));
    
    if (key.includes('\\n')) {
        console.log('Found literal \\n. Replacing...');
        key = key.replace(/\\n/g, '\n');
    }
    
    console.log('Key contains real newlines:', key.includes('\n'));
    console.log('Key Ends With Correct Tag:', key.trim().endsWith('-----END PRIVATE KEY-----'));
    
    const crypto = require('crypto');
    try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update('test');
        sign.sign(key);
        console.log('Key is VALID for signing!');
    } catch (e) {
        console.error('Key is INVALID for signing:', e.message);
    }
} catch (e) {
    console.error('JSON Parse Error:', e.message);
}
