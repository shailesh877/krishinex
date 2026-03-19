
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const axios = require('axios');

async function reproduce() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ email: 'admin@khetify.com' });
        if (!admin) {
            console.log('Admin user not found');
            return;
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role, name: admin.name },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );
        console.log('Generated Token:', token);

        const response = await axios.get('http://localhost:5500/api/employee/admin/search-users?query=9793', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        if (err.response) {
            console.error('API Error:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err);
        }
    }
}

reproduce();
