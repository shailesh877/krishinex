const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const akash = await User.findOne({ name: /Akash/i });
        const ram = await User.findOne({ name: /Ram kumar/i });

        const users = [akash, ram].filter(Boolean);

        for (const u of users) {
            console.log(`--- Checking User: ${u.name} (${u._id}) ---`);
            const orders = await ShopOrder.find({ owner: u._id });
            console.log(`Total Orders: ${orders.length}`);
            orders.forEach(o => {
                console.log(`Order: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Created: ${o.createdAt.toISOString()}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAll();
