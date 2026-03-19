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
            console.log('User found:', {
                id: user._id,
                name: user.name,
                walletBalance: user.walletBalance,
                role: user.role
            });

            const orders = await ShopOrder.find({ owner: user._id }).sort({ createdAt: -1 }).limit(5);
            console.log('Recent Orders for this user:');
            orders.forEach(o => {
                console.log({
                    id: o._id,
                    status: o.status,
                    totalAmount: o.totalAmount,
                    createdAt: o.createdAt
                });
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
