const axios = require('axios');

async function test() {
    console.log('--- STARTING CLEAN TEST ---');
    try {
        const login = await axios.post('http://localhost:5500/api/ksp/login', {
            phone: '9999988888',
            password: 'password123'
        });
        const token = login.data.token;
        console.log('1. Login Success');

        const userId = '69a9ddf748b875747eeda37';
        console.log('2. Requesting OTP for User ID:', userId);
        
        const otpReq = await axios.post('http://localhost:5500/api/ksp/withdraw/request-otp', 
            { userId: userId, amount: 100 },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('3. OTP Request Response:', JSON.stringify(otpReq.data));
        
        console.log('--- TEST SUCCESSFUL ---');
    } catch (err) {
        console.error('--- TEST FAILED ---');
        console.error('Status:', err.response?.status);
        console.error('Error Data:', JSON.stringify(err.response?.data));
        console.error('Message:', err.message);
    }
}

test();
