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
        const token = jwt.sign({ id: 'dummy_admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const headers = { 'Authorization': `Bearer ${token}` };

        // Test date range (e.g. today's date)
        const today = new Date().toISOString().split('T')[0];
        const params = { startDate: today, endDate: today };

        console.log(`Verifying backend endpoints with filter params:`, params);

        // 1. Stats endpoint
        const statsRes = await axios.get('http://localhost:5500/api/employee/admin/shop/stats', { headers, params });
        console.log('Stats Response filtered for today:', {
            totalShops: statsRes.data.totalShops,
            activeShops: statsRes.data.activeShops,
            ordersCount: statsRes.data.thisMonthOrders, // thisMonthOrders behaves as filtered orders
            revenue: statsRes.data.thisMonthRevenue,
            lowStockCount: statsRes.data.lowStockCount
        });

        // 2. Shops endpoint
        const shopsRes = await axios.get('http://localhost:5500/api/employee/admin/shops', { headers, params });
        console.log(`Shops registered today: ${shopsRes.data.length}`);

        // 3. Orders endpoint
        const ordersRes = await axios.get('http://localhost:5500/api/employee/admin/shop/orders', { headers, params });
        console.log(`Orders placed today: ${ordersRes.data.length}`);

        console.log('✅ SUCCESS: All backend endpoints completed successfully with date range queries!');
    } catch (e) {
        console.error('❌ Verification error:', e.response ? e.response.data : e.message);
    }
}

run();
