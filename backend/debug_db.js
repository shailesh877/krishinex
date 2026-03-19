const mongoose = require('mongoose');
require('./models/User'); // Register User model
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

async function checkData() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- LATEST SELL REQUESTS ---');
    const requests = await SellRequest.find({}).sort({ createdAt: -1 }).limit(5).populate('farmer', 'name phone');
    requests.forEach(r => {
        console.log(`ID: ${r._id}, Farmer: ${r.farmer?.name}, PriceStr: "${r.expectedPrice}", QtyStr: "${r.quantity}", Status: ${r.status}`);
    });

    console.log('\n--- LATEST ORDERS ---');
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5);
    orders.forEach(o => {
        console.log(`ID: ${o._id}, Farmer: ${o.farmerName}, PriceQ: ${o.pricePerQuintal}, Qty: "${o.quantity}", Status: ${o.status}`);
    });

    await mongoose.connection.close();
}

checkData();
