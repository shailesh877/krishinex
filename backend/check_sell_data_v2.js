const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
const fs = require('fs');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let output = 'Connected to MongoDB\n';

        const totalFarmers = await User.countDocuments({ role: 'buyer' });
        const orders = await Order.countDocuments({});
        const sellRequestsCount = await SellRequest.countDocuments({});
        const pendingSellRequestsCount = await SellRequest.countDocuments({ status: 'pending' });

        output += '--- Stats ---\n';
        output += `Total Farmers: ${totalFarmers}\n`;
        output += `Total Orders: ${orders}\n`;
        output += `Total Sell Requests: ${sellRequestsCount}\n`;
        output += `Pending Sell Requests: ${pendingSellRequestsCount}\n`;

        const latestSellReq = await SellRequest.findOne({ status: 'pending' }).sort({ createdAt: -1 }).populate('farmer', 'name');
        if (latestSellReq) {
            output += '--- Latest Pending Sell Request ---\n';
            output += `ID: ${latestSellReq._id}\n`;
            output += `Farmer: ${latestSellReq.farmer ? latestSellReq.farmer.name : 'Unknown'}\n`;
            output += `Crop: ${latestSellReq.cropName}\n`;
            output += `Created At: ${latestSellReq.createdAt}\n`;
        } else {
            output += 'No pending sell requests found.\n';
        }

        fs.writeFileSync('db_check_result.txt', output);
        console.log('Results written to db_check_result.txt');
        mongoose.connection.close();
    } catch (err) {
        fs.writeFileSync('db_check_result.txt', 'Error: ' + err.message);
        console.error('Error:', err);
    }
}

checkData();
