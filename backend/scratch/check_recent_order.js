try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();
const ShopOrder = require('../models/ShopOrder');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB.');
        const latestOrder = await ShopOrder.findOne({}).sort({ createdAt: -1 }).populate('buyer');
        if (!latestOrder) {
            console.log('No orders found.');
            mongoose.connection.close();
            return;
        }

        console.log('=== LATEST ORDER ===');
        console.log(`Order ID: ${latestOrder._id}`);
        console.log(`Status: ${latestOrder.status}`);
        console.log(`Total Amount: ₹${latestOrder.totalAmount}`);
        console.log(`Created At: ${latestOrder.createdAt}`);

        if (latestOrder.buyer) {
            console.log('=== BUYER DETAILS ===');
            console.log(`Buyer Name: ${latestOrder.buyer.name}`);
            console.log(`Buyer Phone: ${latestOrder.buyer.phone}`);
            console.log(`Buyer Role: ${latestOrder.buyer.role}`);
            console.log(`FCM Token: ${latestOrder.buyer.fcmToken ? latestOrder.buyer.fcmToken.substring(0, 30) + '...' : 'NULL'}`);
        } else {
            console.log('No buyer population/reference on this order.');
        }

        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
