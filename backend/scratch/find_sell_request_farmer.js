const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SellRequest = require('../models/SellRequest');

async function run() {
    try {
        try {
            require('dns').setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            console.warn('DNS setServers failed:', dnsErr.message);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const req1 = await SellRequest.findById('6a0d9fb412ea291d2c3ae61e').lean();
        const req2 = await SellRequest.findById('6a0d9fb412ea291d2c3ae620').lean();

        console.log("Raw Req 1 Farmer ObjectId:", req1 ? req1.farmer : 'not found');
        console.log("Raw Req 2 Farmer ObjectId:", req2 ? req2.farmer : 'not found');

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
