const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkDashboard() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ name: /Akash/i, role: 'shop' });
        if (!user) {
            console.log('User not found');
            return;
        }

        const ownerId = user._id;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        console.log(`Calculating for User: ${user.name} (${ownerId})`);
        console.log(`Start of Today: ${startOfToday.toISOString()}`);

        const totalOrders = await ShopOrder.countDocuments({ owner: ownerId });
        const totalDelivered = await ShopOrder.countDocuments({ owner: ownerId, status: 'DELIVERED' });

        const todayNew = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'NEW',
            createdAt: { $gte: startOfToday }
        });
        const todayAccepted = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'ACCEPTED',
            createdAt: { $gte: startOfToday }
        });
        const todayDelivered = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'DELIVERED',
            createdAt: { $gte: startOfToday }
        });

        console.log('DASHBOARD_RESPONSE_SIM_START');
        console.log(JSON.stringify({
            lifetime: { totalOrders, totalDelivered },
            today: { new: todayNew, accepted: todayAccepted, delivered: todayDelivered }
        }));
        console.log('DASHBOARD_RESPONSE_SIM_END');

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDashboard();
