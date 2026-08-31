const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function debugJWT() {
    console.log('--- JWT MANUAL SIGNING DEBUG ---');
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('serviceAccountKey.json not found!');
        return;
    }

    const serviceAccount = require(serviceAccountPath);
    let privateKey = serviceAccount.private_key;
    if (privateKey) {
        privateKey = privateKey
            .split('\\n').join('\n')
            .split('\\r').join('\r')
            .trim();
    }

    // Header
    const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: serviceAccount.private_key_id
    };

    // Payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    console.log('JWT Header:', JSON.stringify(header));
    console.log('JWT Payload:', JSON.stringify(payload));

    const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64UrlPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${base64UrlHeader}.${base64UrlPayload}`;

    try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signatureInput);
        const signature = sign.sign(privateKey, 'base64url');
        const jwt = `${signatureInput}.${signature}`;
        console.log('✅ Successfully signed JWT manually!');
        console.log('Generated JWT:', jwt);
        
        // Let's verify our own signature using the public key from the private key!
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(signatureInput);
        
        const publicKey = crypto.createPublicKey(privateKey);
        const isVerified = verify.verify(publicKey, signature, 'base64url');
        console.log('Is our own signature verified locally by public key?', isVerified ? 'YES! ✅' : 'NO! ❌');
    } catch (e) {
        console.error('❌ Signing failed:', e.message);
    }
}

debugJWT();
