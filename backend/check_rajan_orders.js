const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkRajan() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const rajan = await User.findOne({ name: /Rajan Giri/i });
        if (!rajan) {
            console.log('Rajan Giri not found');
            return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const orders = await ShopOrder.find({ buyer: rajan._id, createdAt: { $gte: startOfToday } })
            .populate('owner', 'name role');

        console.log(`Found ${orders.length} orders from Rajan Giri today`);
        orders.forEach(o => {
            console.log(`Order: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Owner: ${o.owner ? o.owner.name : 'NULL'}, OwnerRole: ${o.owner ? o.owner.role : 'NULL'}`);
            o.items.forEach(it => {
                console.log(`  Item: ${it.name}, Qty: ${it.quantity}, Price: ${it.price}`);
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkRajan();
