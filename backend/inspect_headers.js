const axios = require('axios');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const mongoose = require('mongoose');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);

    const admin = await User.findOne({ role: 'admin' });
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    try {
        const res = await axios.get('http://127.0.0.1:5000/api/employee/admin/kyc/export', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Status:", res.status);
        console.log("Headers:", res.headers);
        console.log("Data length:", res.data.length);
    } catch (e) {
        console.error("Error headers:", e.response ? e.response.headers : e.message);
    }
    process.exit(0);
}

check();
