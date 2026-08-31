const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/User');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    // Find an admin user or generate a test admin token
    const admin = await User.findOne({ role: { $in: ['admin', 'employee', 'superadmin'] } });
    console.log('Admin user found:', admin ? admin.phone : 'None');

    const token = jwt.sign(
        { id: admin ? admin._id : 'dummy', role: admin ? admin.role : 'admin', modulePermissions: ['users', 'doctor', 'all'] },
        process.env.JWT_SECRET || 'khetify_jwt_secret_2026_secure',
        { expiresIn: '1d' }
    );

    try {
        const statsRes = await axios.get('http://localhost:5500/api/employee/admin/farmers/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('--- STATS API RESPONSE ---');
        console.log(statsRes.data);
    } catch (e) {
        console.error('Stats error:', e.response ? e.response.data : e.message);
    }

    try {
        const reqsRes = await axios.get('http://localhost:5500/api/employee/admin/crop-requests', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('--- CROP REQUESTS API RESPONSE ---');
        console.log('Total items returned:', reqsRes.data.length);
        if (reqsRes.data.length > 0) {
            console.log('Sample items status breakdown:');
            const counts = reqsRes.data.reduce((acc, r) => { acc[r.status] = (acc[r.status]||0)+1; return acc; }, {});
            console.log(counts);
        }
    } catch (e) {
        console.error('Crop Requests error:', e.response ? e.response.data : e.message);
    }

    process.exit(0);
}

test();
