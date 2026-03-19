const mongoose = require('mongoose');
require('./models/User'); // Register User model
const Order = require('./models/Order');
const SellRequest = require('./models/SellRequest');
require('dotenv').config();

const parsePriceInQuintals = (priceStr) => {
    if (!priceStr) return 0;
    const str = String(priceStr);
    const matches = str.match(/\d+(\.\d+)?/g);
    if (!matches) return 0;
    const prices = matches.map(m => parseFloat(m));
    const qmatch = str.match(/₹?(\d+(\.\d+)?)\s*\/\s*Quintal/i);
    if (qmatch) return parseFloat(qmatch[1]) || 0;
    if (prices.length > 1) return Math.max(...prices);
    if (str.toLowerCase().includes('/ kg') && prices.length === 1) return prices[0] * 100;
    return prices[0] || 0;
};

async function fixLowPrices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find orders with pricePerQuintal = 1 (our suspicion threshold)
        const suspiciousOrders = await Order.find({ 
            pricePerQuintal: { $lt: 5 }, // Anything less than 5 is highly suspicious for a quintal
            sellRequestId: { $exists: true } 
        }).populate('sellRequestId');

        console.log(`Found ${suspiciousOrders.length} suspicious orders.`);

        for (const order of suspiciousOrders) {
            if (order.sellRequestId && order.sellRequestId.expectedPrice) {
                const correctPrice = parsePriceInQuintals(order.sellRequestId.expectedPrice);
                if (correctPrice > order.pricePerQuintal) {
                    console.log(`Fixing Order ${order._id}: ${order.pricePerQuintal} -> ${correctPrice}`);
                    order.pricePerQuintal = correctPrice;
                    order.pricePerKg = correctPrice / 100;
                    // Recalculate amount if needed
                    // order.amount = (correctPrice * parsedQty) ... but let's just fix the rates first
                    await order.save();
                }
            }
        }

        console.log('Cleanup complete.');
        await mongoose.connection.close();
    } catch (e) {
        console.error('Cleanup error:', e);
    }
}

fixLowPrices();
