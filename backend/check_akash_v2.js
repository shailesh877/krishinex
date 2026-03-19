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
            console.log('USER_INFO_START');
            console.log(JSON.stringify({
                id: user._id,
                name: user.name,
                walletBalance: user.walletBalance,
                role: user.role
            }));
            console.log('USER_INFO_END');

            const orders = await ShopOrder.find({ owner: user._id }).sort({ createdAt: -1 }).limit(10);
            console.log('ORDERS_START');
            orders.forEach(o => {
                console.log(JSON.stringify({
                    id: o._id,
                    status: o.status,
                    totalAmount: o.totalAmount,
                    items: o.items,
                    createdAt: o.createdAt
                }));
            });
            console.log('ORDERS_END');
        } else {
            console.log('User "Akash" not found');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
