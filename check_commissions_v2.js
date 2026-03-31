const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
dotenv.config({ path: 'd:/khetify/backend/.env' });

const Order = require('d:/khetify/backend/models/Order');
const Settings = require('d:/khetify/backend/models/Settings');

async function check() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.findOne();
        console.log('Current Settings Commissions:', JSON.stringify(settings.commissions, null, 2));

        const orders = await Order.find({ }).sort({ createdAt: -1 }).limit(10);
        console.log('Latest 10 Orders:');
        orders.forEach(o => {
            console.log(`ID: ${o._id}, Crop: ${o.crop}, Amt: ${o.amount}, Comm: ${o.commission}, Rate: ${o.commissionRate}, Status: ${o.status}/${o.assignedStatus}, CreatedAt: ${o.createdAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
