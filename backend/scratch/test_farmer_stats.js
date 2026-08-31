const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const User = require('../models/User');

async function testStatsAPI() {
    await mongoose.connect(process.env.MONGODB_URI);
    const u = await User.findOne({ email: 'admin@krishinex.com' });
    const token = jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
    
    const res = await axios.get('http://localhost:5500/api/employee/admin/farmers/stats', {
        headers: { Authorization: 'Bearer ' + token }
    });
    
    console.log('STATS API RESPONSE:', res.data);
    mongoose.connection.close();
}

testStatsAPI();
