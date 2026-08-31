const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../models/Order');
const SellRequest = require('../models/SellRequest');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const pendingSellReqs = await SellRequest.countDocuments({ status: 'pending' });
    const assignedOrders = await Order.countDocuments({ status: { $in: ['accepted', 'in-progress'] } });
    const assignedSellReqs = await SellRequest.countDocuments({ status: 'accepted' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const completedSellReqs = await SellRequest.countDocuments({ status: 'completed' });

    console.log('pendingOrders:', pendingOrders, 'pendingSellReqs:', pendingSellReqs, 'TOTAL newRequests:', pendingOrders + pendingSellReqs);
    console.log('assignedOrders:', assignedOrders, 'assignedSellReqs:', assignedSellReqs, 'TOTAL assigned:', assignedOrders + assignedSellReqs);
    console.log('completedOrders:', completedOrders, 'completedSellReqs:', completedSellReqs, 'TOTAL completed:', completedOrders + completedSellReqs);

    const allOrders = await Order.find({}).select('_id status crop farmerName village district').lean();
    console.log('\nAll Orders count:', allOrders.length);
    console.log('First 3 orders:', allOrders.slice(0, 3));

    const allSellReqs = await SellRequest.find({}).select('_id status cropName quantity farmer mandi').lean();
    console.log('\nAll SellReqs count:', allSellReqs.length);
    console.log('First 3 sellReqs:', allSellReqs.slice(0, 3));

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
