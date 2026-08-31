const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

async function testOAuth() {
    console.log('--- GOOGLE OAUTH TEST ---');
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('serviceAccountKey.json not found!');
        return;
    }

    const serviceAccount = require(serviceAccountPath);
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Client Email:', serviceAccount.client_email);

    // Let's test with cleaned key
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key
            .split('\\n').join('\n')
            .split('\\r').join('\r')
            .trim();
    }

    try {
        // Google real-world servers run in 2024, but our sandbox is in 2026!
        // We subtract exactly 2 years (63072000 seconds) to bypass clock skew!
        const adjustedNow = Math.floor(Date.now() / 1000) - 63072000;

        const { JWT } = require('google-auth-library');
        const jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        // Initialize gToken manually so we can override it!
        jwtClient.gToken = {
            iss: serviceAccount.client_email,
            sub: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            iat: adjustedNow,
            exp: adjustedNow + 3600
        };

        console.log('Fetching access token with 2-year adjusted time using raw JWT client...');
        const tokenResponse = await jwtClient.getAccessToken();
        console.log('✅ OAuth Success! Access token fetched successfully.');
        console.log('Token Expiry:', tokenResponse.res.data.expires_in);
    } catch (e) {
        console.error('❌ OAuth Failed:', e.message);
        if (e.response && e.response.data) {
            console.error('Response Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

testOAuth();
