const axios = require('axios');
require('dotenv').config();

async function verifyMultiSearch() {
    const API_BASE = 'http://192.168.31.124:5500/api';
    const phone = '9648022011'; // Known duplicate
    
    try {
        // Need to login as KSP first to get token
        // Using credentials from kspRoutes.js (e.g., the one I created in verify_ksp.js or an existing one)
        // Let's try to login as '9999988888' / 'password123'
        const loginRes = await axios.post(`${API_BASE}/ksp/login`, {
            phone: '9999988888',
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        console.log('Logged in as KSP Partner');

        const searchRes = await axios.post(`${API_BASE}/ksp/search`, 
            { query: phone },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        console.log('Search Result:', JSON.stringify(searchRes.data, null, 2));

        if (Array.isArray(searchRes.data) && searchRes.data.length > 1) {
            console.log('✅ MULTI-SEARCH VERIFIED: Multiple accounts returned.');
        } else {
            console.error('❌ MULTI-SEARCH FAILED: Expected an array with multiple accounts.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Verification failed:', e.response?.data || e.message);
        process.exit(1);
    }
}

verifyMultiSearch();
