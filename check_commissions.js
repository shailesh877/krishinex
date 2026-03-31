const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const Order = require('./backend/models/Order');
const Settings = require('./backend/models/Settings');

async function check() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.findOne();
        console.log('Current Settings Commissions:', JSON.stringify(settings.commissions, null, 2));

        const orders = await Order.find({ assignedStatus: 'ok' }).sort({ createdAt: -1 }).limit(10);
        console.log('Latest 10 Assigned (OK) Orders:');
        orders.forEach(o => {
            console.log(`ID: ${o._id}, Crop: ${o.crop}, Amt: ${o.amount}, Comm: ${o.commission}, Rate: ${o.commissionRate}, Status: ${o.assignedStatus}, CreatedAt: ${o.createdAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
