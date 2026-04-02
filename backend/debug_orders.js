const mongoose = require('mongoose');
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to CORRECT MongoDB Atlas');

        const orders = await Order.find({ status: 'completed' })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('sellRequestId');

        if (orders.length === 0) {
            console.log('No completed orders found.');
            process.exit(0);
        }

        orders.forEach(o => {
            console.log(`\n--- Order #${o._id.toString().slice(-6)} ---`);
            console.log(`Status: ${o.status} | AssignedStatus: ${o.assignedStatus}`);
            console.log(`Updated At: ${o.updatedAt}`);
            console.log(`Crop: ${o.crop}`);
            console.log(`Qty (In Order Doc): "${o.quantity}"`);
            console.log(`Price/Qtl (In Order Doc): ${o.pricePerQuintal}`);
            console.log(`farmerAmount (Payout): ${o.farmerAmount}`);
            console.log(`amountReceived (Total): ${o.amountReceived}`);
            if(o.sellRequestId) {
               console.log(`Linked SellRequest Status: ${o.sellRequestId.status}`);
               console.log(`SellRequest Expected Qty: "${o.sellRequestId.quantity}"`);
               console.log(`SellRequest Expected Price: "${o.sellRequestId.expectedPrice}"`);
               console.log(`SellRequest Admin Price: ${o.sellRequestId.adminPrice}`);
            } else {
               console.log('NO LINKED SELL REQUEST');
            }
        });

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit(0);
    }
}

debug();
