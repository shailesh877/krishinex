const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const totalFarmers = await User.countDocuments({ role: 'buyer' });
        const orders = await Order.countDocuments({});
        const sellRequests = await SellRequest.countDocuments({});
        const pendingSellRequests = await SellRequest.countDocuments({ status: 'pending' });

        console.log('--- Stats ---');
        console.log('Total Farmers:', totalFarmers);
        console.log('Total Orders:', orders);
        console.log('Total Sell Requests:', sellRequests);
        console.log('Pending Sell Requests:', pendingSellRequests);

        const latestSellReq = await SellRequest.findOne({ status: 'pending' }).sort({ createdAt: -1 }).populate('farmer', 'name');
        if (latestSellReq) {
            console.log('--- Latest Pending Sell Request ---');
            console.log('ID:', latestSellReq._id);
            console.log('Farmer:', latestSellReq.farmer ? latestSellReq.farmer.name : 'Unknown');
            console.log('Crop:', latestSellReq.cropName);
            console.log('Created At:', latestSellReq.createdAt);
        } else {
            console.log('No pending sell requests found.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
