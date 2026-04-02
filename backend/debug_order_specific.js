const mongoose = require('mongoose');
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Look for orders like D96DBA
        const orders = await Order.find({})
            .populate('sellRequestId');
        
        const matches = orders.filter(o => o._id.toString().toLowerCase().endsWith('d96dba') || o._id.toString().toUpperCase().endsWith('D96DBA'));

        if (matches.length === 0) {
            console.log('No order found matching D96DBA');
            // Show last 3 completed orders anyway
            const last3 = await Order.find({ status: 'completed' }).sort({ updatedAt: -1 }).limit(3);
            last3.forEach(o => console.log(`Last Completed: ${o._id} | Qty: ${o.quantity} | Price: ${o.pricePerQuintal} | Amt: ${o.amount}`));
        } else {
            const o = matches[0];
            console.log(`\n--- FOUND ORDER #${o._id} ---`);
            console.log(`Status: ${o.status}`);
            console.log(`Quantity: "${o.quantity}"`);
            console.log(`Price/Qtl: ${o.pricePerQuintal}`);
            console.log(`Amount (Item Total): ${o.amount}`);
            console.log(`FarmerAmount: ${o.farmerAmount}`);
            console.log(`AmountReceived (Total Payable): ${o.amountReceived}`);
            console.log(`Commission: ${o.commission}`);
            console.log(`CommissionRate: ${o.commissionRate}`);
            if(o.sellRequestId) {
                console.log(`SellRequest Status: ${o.sellRequestId.status}`);
                console.log(`SellReq Qty: ${o.sellRequestId.quantity}`);
                console.log(`SellReq Expected: ${o.sellRequestId.expectedPrice}`);
                console.log(`SellReq AdminPrice: ${o.sellRequestId.adminPrice}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

debug();
