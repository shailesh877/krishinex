const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ name: /Akash/i, role: 'shop' });
        if (!user) {
            console.log('Akash not found');
            return;
        }

        const ownerId = user._id;
        const allOrders = await ShopOrder.find({ owner: ownerId });
        console.log(`Total Orders found in DB: ${allOrders.length}`);

        const statusCounts = allOrders.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});
        console.log('Status Counts:', statusCounts);

        const now = new Date();
        const startOfTodayIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        startOfTodayIST.setUTCHours(0, 0, 0, 0);
        // We need to compare UTC timestamps in DB with the IST "start of day" converted back to UTC
        const istStartOffset = (5.5 * 60 * 60 * 1000);
        const startOfTodayUTC = new Date(startOfTodayIST.getTime() - istStartOffset);
        
        // Simple midnight UTC check (what current code does)
        const startOfTodaySimple = new Date();
        startOfTodaySimple.setHours(0,0,0,0);

        console.log(`IST Start of Day (in UTC): ${startOfTodayUTC.toISOString()}`);
        console.log(`Simple UTC Start of Day: ${startOfTodaySimple.toISOString()}`);

        const todayOrders = allOrders.filter(o => o.createdAt >= startOfTodaySimple);
        console.log(`Orders created since Simple UTC midnight: ${todayOrders.length}`);
        
        const todayOrdersIST = allOrders.filter(o => o.createdAt >= startOfTodayUTC);
        console.log(`Orders created since IST midnight: ${todayOrdersIST.length}`);

        console.log('--- Order Details ---');
        allOrders.forEach(o => {
            console.log(`ID: ${o._id}, Status: ${o.status}, Amount: ${o.totalAmount}, Created: ${o.createdAt.toISOString()}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

diagnose();
