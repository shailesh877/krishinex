const mongoose = require('mongoose');
const SellRequest = require('../models/SellRequest');
const Order = require('../models/Order');

const mongoUri = 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function migrate() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const requests = await SellRequest.find({ status: 'completed', totalAmount: null });
        console.log(`Found ${requests.length} completed requests without totalAmount`);

        for (const req of requests) {
            // Try to find the linked order
            const order = await Order.findOne({ sellRequestId: req._id, status: 'completed' });
            if (order && order.amount) {
                req.totalAmount = order.amount;
                await req.save();
                console.log(`Updated Req #${req._id} with Amount from Order: ${order.amount}`);
            } else if (req.adminPrice && req.quantity) {
                // Manual calculation if order not found or doesn't have amount
                const qtyStr = String(req.quantity);
                let qtl = 0;
                
                const quintalMatch = qtyStr.match(/\(?([\d.]+)\s*Quintal\)?/i);
                if (quintalMatch) {
                    qtl = parseFloat(quintalMatch[1]);
                } else if (qtyStr.toLowerCase().includes('kg')) {
                    const kgMatch = qtyStr.match(/([\d.]+)/);
                    if (kgMatch) qtl = parseFloat(kgMatch[1]) / 100;
                } else {
                    const genericMatch = qtyStr.match(/([\d.]+)/);
                    if (genericMatch) qtl = parseFloat(genericMatch[1]);
                }

                if (qtl > 0) {
                    const total = Math.round(qtl * req.adminPrice);
                    req.totalAmount = total;
                    await req.save();
                    console.log(`Updated Req #${req._id} with Calculated Amount: ${total} (Qty: ${qtl} Qtl, Price: ${req.adminPrice})`);
                } else {
                    console.log(`Could not parse quantity for Req #${req._id}: "${qtyStr}"`);
                }
            }
        }

        console.log('Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
