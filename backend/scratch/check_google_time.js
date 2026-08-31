const https = require('https');

function checkGoogleTime() {
    console.log('--- GOOGLE SERVER TIME DIAGNOSTICS ---');
    const localTime = new Date();
    console.log('Local system time:', localTime.toISOString());

    const req = https.request('https://www.google.com', { method: 'HEAD' }, (res) => {
        const googleDateStr = res.headers.date;
        if (!googleDateStr) {
            console.error('Google did not return a Date header.');
            return;
        }

        console.log('Google Server Date Header:', googleDateStr);
        const googleTime = new Date(googleDateStr);
        console.log('Google Server time (UTC):', googleTime.toISOString());

        const diffMs = Math.abs(localTime - googleTime);
        console.log('Time difference (ms):', diffMs);
        console.log('Time difference (seconds):', diffMs / 1000);
        console.log('Time difference (minutes):', diffMs / 1000 / 60);

        if (diffMs > 5 * 60 * 1000) {
            console.error('\n❌ CRITICAL CLOCK SYNC WARNING:');
            console.error('Your computer\'s clock is out of sync by', (diffMs / 1000 / 60).toFixed(2), 'minutes!');
            console.error('Because of this clock difference, Google OAuth2 will ALWAYS reject your service account with "Invalid JWT Signature".');
        } else {
            console.log('\n✅ System clock is perfectly in sync with Google servers!');
        }
    });

    req.on('error', (e) => {
        console.error('Error connecting to Google:', e.message);
    });

    req.end();
}

checkGoogleTime();
