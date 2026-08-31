const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const ShopOrder = require('../models/ShopOrder');
const FranchiseSale = require('../models/FranchiseSale');

async function checkDates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        console.log('Local Server Now:', now.toISOString());
        console.log('Local Server startOfToday:', startOfToday.toISOString());

        const recentShopOrder = await ShopOrder.findOne({}).sort({ createdAt: -1 });
        if (recentShopOrder) {
            console.log('Most recent ShopOrder createdAt:', recentShopOrder.createdAt.toISOString(), 'Total:', recentShopOrder.totalAmount);
        } else {
            console.log('No ShopOrders found!');
        }

        const recentSale = await FranchiseSale.findOne({}).sort({ createdAt: -1 });
        if (recentSale) {
            console.log('Most recent FranchiseSale createdAt:', recentSale.createdAt.toISOString(), 'Total:', recentSale.totalAmount);
        } else {
            console.log('No FranchiseSales found!');
        }

        const shopCountToday = await ShopOrder.countDocuments({ createdAt: { $gte: startOfToday } });
        console.log('ShopOrders created after startOfToday:', shopCountToday);

        const otcCountToday = await FranchiseSale.countDocuments({ createdAt: { $gte: startOfToday } });
        console.log('FranchiseSales created after startOfToday:', otcCountToday);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkDates();
