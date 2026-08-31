const fetch = require('node-fetch');

async function checkTime() {
    console.log('--- TIME DIAGNOSTICS ---');
    const localTime = new Date();
    console.log('Local system time:', localTime.toISOString());
    console.log('Local system time (Locale):', localTime.toString());

    try {
        const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
        if (response.ok) {
            const data = await response.json();
            const networkTime = new Date(data.utc_datetime);
            console.log('Global Network time (UTC):', networkTime.toISOString());
            
            const diffMs = Math.abs(localTime - networkTime);
            console.log('Time difference (ms):', diffMs);
            console.log('Time difference (seconds):', diffMs / 1000);
            console.log('Time difference (minutes):', diffMs / 1000 / 60);

            if (diffMs > 5 * 60 * 1000) {
                console.error('❌ CRITICAL WARNING: Your system clock is out of sync by more than 5 minutes!');
                console.error('Because of this, Google OAuth2 will ALWAYS reject your service account signature with "Invalid JWT Signature".');
                console.error('To fix this, please synchronize your computer\'s date and time settings with Windows Time Server.');
            } else {
                console.log('✅ System clock is perfectly in sync with global network time!');
            }
        } else {
            console.error('Failed to fetch world time. Status:', response.status);
        }
    } catch (e) {
        console.error('Error fetching global network time:', e.message);
    }
}

checkTime();
