const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed:', e.message);
}

async function run() {
    try {
        // Generate admin token
        const token = jwt.sign({ id: 'dummy_admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Get shops list to find a shop partner ID
        console.log('Fetching shops list...');
        const shopsRes = await axios.get('http://localhost:5500/api/employee/admin/shops', { headers });
        const shops = shopsRes.data;
        if (!shops || shops.length === 0) {
            console.log('No shops found.');
            return;
        }

        const shop = shops[0];
        console.log(`Found shop: ${shop.businessName} (ID: ${shop._id})`);
        console.log('List API Aadhaar Docs:', {
            aadhaarDocUrl: shop.aadhaarDocUrl,
            aadhaarBackDocUrl: shop.aadhaarBackDocUrl
        });

        // 2. Fetch shop 360 details
        const url = `http://localhost:5500/api/employee/admin/shop/${shop._id}/360`;
        console.log(`Calling GET ${url}...`);
        const res = await axios.get(url, { headers });

        console.log('Shop details successfully loaded.');
        const profile = res.data.profile;
        console.log('360 Profile Aadhaar Docs:', {
            aadhaarDocUrl: profile.aadhaarDocUrl,
            aadhaarBackDocUrl: profile.aadhaarBackDocUrl
        });

        if (profile.hasOwnProperty('aadhaarDocUrl') && profile.hasOwnProperty('aadhaarBackDocUrl')) {
            console.log('✅ SUCCESS: Both front and back Aadhaar doc URLs are present in the response!');
        } else {
            console.log('❌ FAILURE: Missing Aadhaar front or back doc URLs!');
        }

    } catch (e) {
        console.error('Verification error:', e.response ? e.response.data : e.message);
    }
}

run();
