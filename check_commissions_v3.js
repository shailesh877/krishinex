const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Simple .env parser to avoid dependency issues in root
const envPath = 'd:/khetify/backend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
    }
});

const mongoUri = process.env.MONGODB_URI;

// Use paths for models
const Order = require('d:/khetify/backend/models/Order');
const Settings = require('d:/khetify/backend/models/Settings');

async function check() {
    try {
        console.log('Connecting to:', mongoUri);
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const settings = await Settings.findOne();
        console.log('Current Settings Commissions:', JSON.stringify(settings.commissions, null, 2));

        const orders = await Order.find({ }).sort({ createdAt: -1 }).limit(20);
        console.log('Latest 20 Orders:');
        orders.forEach(o => {
            console.log(`ID: ${o._id}, Crop: ${o.crop}, Amt: ${o.amount}, Comm: ${o.commission}, Rate: ${o.commissionRate}, Stat: ${o.status}/${o.assignedStatus}, CreatedAt: ${o.createdAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
