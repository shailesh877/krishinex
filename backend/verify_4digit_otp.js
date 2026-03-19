const axios = require('axios');
require('dotenv').config();

async function verify4DigitOtp() {
    const API_BASE = 'http://localhost:5500/api';
    const TEST_USER_ID = '69a9ddf748b875747eeda37'; 
    
    try {
        const loginRes = await axios.post(`${API_BASE}/ksp/login`, {
            phone: '9999988888',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Logged in as KSP');

        const reqRes = await axios.post(`${API_BASE}/ksp/withdraw/request-otp`, 
            { userId: TEST_USER_ID, amount: 100 },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('OTP Request Response:', reqRes.data);

        console.log('✅ 4-DIGIT OTP VERIFIED: Check server logs for the 4-digit code.');
        process.exit(0);
    } catch (e) {
        console.error('Final verification failed:', e.response?.data || e.message);
        process.exit(1);
    }
}

verify4DigitOtp();
