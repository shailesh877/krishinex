try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed (skipping):', e.message);
}

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Order = require('../models/Order');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const bhagwatiId = '69aed48333ca35b64fd454da';
        const karmanId = '69be46fbd163eed828fa6711';

        console.log('\n=== ORDERS FOR BHAGWATI TREDERS ===');
        const bOrders = await Order.find({ buyer: bhagwatiId }).lean();
        bOrders.forEach(o => {
            console.log(`Order ID: ${o._id}`);
            console.log(`  quantity: "${o.quantity}"`);
            console.log(`  pricePerQuintal: ${o.pricePerQuintal}`);
            console.log(`  amount: ${o.amount}`);
            console.log(`  commission: ${o.commission}`);
            console.log(`  amountReceived: ${o.amountReceived}`);
            console.log(`  farmerAmount: ${o.farmerAmount}`);
            console.log(`  settlement: "${o.settlement}"`);
            console.log(`  status: "${o.status}"`);
        });

        console.log('\n=== ORDERS FOR KARMAN &BEYOND ===');
        const kOrders = await Order.find({ buyer: karmanId }).lean();
        kOrders.forEach(o => {
            console.log(`Order ID: ${o._id}`);
            console.log(`  quantity: "${o.quantity}"`);
            console.log(`  pricePerQuintal: ${o.pricePerQuintal}`);
            console.log(`  amount: ${o.amount}`);
            console.log(`  commission: ${o.commission}`);
            console.log(`  amountReceived: ${o.amountReceived}`);
            console.log(`  farmerAmount: ${o.farmerAmount}`);
            console.log(`  settlement: "${o.settlement}"`);
            console.log(`  status: "${o.status}"`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
