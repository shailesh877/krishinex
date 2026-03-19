const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkOrders() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const orders = await ShopOrder.find({}).sort({ createdAt: -1 }).limit(20).populate('owner', 'name role');
        console.log(`Found ${orders.length} recent orders`);
        
        orders.forEach(o => {
            console.log(`Order: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Owner: ${o.owner ? o.owner.name : 'NULL'}, OwnerRole: ${o.owner ? o.owner.role : 'NULL'}, Created: ${o.createdAt.toISOString()}`);
            if (o.items && o.items.length > 0) {
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

checkOrders();
