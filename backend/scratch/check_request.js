const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Order = require('../models/Order');
const SellRequest = require('../models/SellRequest');
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

        const id = '6a0d9fb412ea291d2c3ae620';
        
        const order = await Order.findById(id).populate('buyer').populate('assignedTo').lean();
        const sellReq = await SellRequest.findById(id).populate('farmer').lean();

        console.log("--- ORDER ---");
        console.log(order);

        console.log("--- SELL REQUEST ---");
        console.log(sellReq);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
