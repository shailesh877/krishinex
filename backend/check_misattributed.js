const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkMisattributed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const orders = await ShopOrder.find({});
        console.log(`Checking ${orders.length} total orders...`);

        const misattributed = orders.filter(o => o.owner.toString() === o.buyer.toString());
        console.log(`Found ${misattributed.length} orders where owner == buyer`);

        misattributed.forEach(o => {
            console.log(`Order: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Created: ${o.createdAt}`);
            o.items.forEach(it => {
                console.log(`  Item: ${it.name}, Qty: ${it.quantity}`);
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMisattributed();
