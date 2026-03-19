const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ name: /Akash/i, role: 'shop' });
        if (user) {
            console.log(`User: ${user.name} (${user._id}), Balance: ${user.walletBalance}`);

            const orders = await ShopOrder.find({ owner: user._id, status: 'DELIVERED' });
            console.log(`Found ${orders.length} DELIVERED orders`);
            orders.forEach(o => {
                console.log(`Order: ${o._id}, Amount: ${o.totalAmount}, Created: ${o.createdAt}`);
            });
        } else {
            console.log('User "Akash" not found');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
