const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');

dotenv.config();

async function checkFinalIST() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        istNow.setUTCHours(0, 0, 0, 0);
        const startOfTodayIST = new Date(istNow.getTime() - istOffset);

        console.log(`Current Time (UTC): ${now.toISOString()}`);
        console.log(`Current Time (IST Sim): ${new Date(now.getTime() + istOffset).toISOString()}`);
        console.log(`IST Start of Today (in UTC): ${startOfTodayIST.toISOString()}`);

        const akash = await User.findOne({ name: /Akash/i, role: 'shop' });
        const ordersToday = await ShopOrder.countDocuments({
            owner: akash._id,
            createdAt: { $gte: startOfTodayIST }
        });

        console.log(`Total orders for Akash created today (IST midnight to now): ${ordersToday}`);
        
        const details = await ShopOrder.find({
            owner: akash._id,
            createdAt: { $gte: startOfTodayIST }
        });
        details.forEach(o => {
            console.log(`Order: ${o._id}, Status: ${o.status}, Created: ${o.createdAt.toISOString()}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkFinalIST();
