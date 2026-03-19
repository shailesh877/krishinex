const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkRecent() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const orders = await ShopOrder.find({ createdAt: { $gte: twoHoursAgo } }).populate('owner', 'name role').populate('buyer', 'name');
        
        console.log(`Found ${orders.length} orders created in the last 2 hours`);
        
        orders.forEach(o => {
            console.log(`Order: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Owner: ${o.owner ? o.owner.name : 'NULL'}, OwnerRole: ${o.owner ? o.owner.role : 'NULL'}, Buyer: ${o.buyer ? o.buyer.name : 'NULL'}`);
            if (o.items) {
                o.items.forEach(it => {
                    console.log(`  Item: ${it.name}, Qty: ${it.quantity}, Price: ${it.price}`);
                });
            }
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkRecent();
