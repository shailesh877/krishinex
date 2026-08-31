const mongoose = require('mongoose');
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
        // Generate valid admin token
        const token = jwt.sign({ id: 'dummy_admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Call the shop orders endpoint
        console.log('Calling GET /api/employee/admin/shop/orders...');
        const res = await axios.get('http://localhost:5500/api/employee/admin/shop/orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Orders retrieved count:', res.data.length);
        if (res.data.length > 0) {
            const firstOrder = res.data[0];
            console.log('First Order details:', {
                id: firstOrder._id,
                buyerName: firstOrder.buyerName,
                buyerPhone: firstOrder.buyerPhone,
                totalAmount: firstOrder.totalAmount,
                itemsCount: firstOrder.items ? firstOrder.items.length : 0,
                firstItem: firstOrder.items && firstOrder.items.length > 0 ? firstOrder.items[0] : null,
                deliveryAddress: firstOrder.deliveryAddress
            });

            if (firstOrder.items && Array.isArray(firstOrder.items) && firstOrder.deliveryAddress) {
                console.log('✅ SUCCESS: items array and deliveryAddress object are present and correctly populated!');
            } else {
                console.log('❌ FAILURE: items or deliveryAddress are missing/malformed!');
            }
        } else {
            console.log('⚠️ No orders found in database.');
        }

    } catch (e) {
        console.error('Test error:', e.response ? e.response.data : e.message);
    }
}

run();
