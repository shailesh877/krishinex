const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function run() {
    try {
        try {
            require('dns').setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            console.warn('DNS setServers failed:', dnsErr.message);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const farmers = await User.find({ role: { $in: ['farmer', 'user'] } }).select('name phone role').lean();
        console.log(`Total Farmers/Users: ${farmers.length}`);
        console.log(farmers);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
