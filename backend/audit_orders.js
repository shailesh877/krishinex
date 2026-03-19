const mongoose = require('mongoose');
require('./models/User'); 
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

async function findOrders() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('--- ALL ORDERS (RECENT 10) ---');
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(10).populate('sellRequestId');
    orders.forEach(o => {
        const srPrice = o.sellRequestId ? o.sellRequestId.expectedPrice : 'NO SR';
        console.log(`Order ID: ${o._id}, Crop: ${o.crop}, Qty: ${o.quantity}, PriceQ: ${o.pricePerQuintal}, Amount: ${o.amount}, SR String: "${srPrice}", Status: ${o.status}`);
    });

    await mongoose.connection.close();
}

findOrders();
