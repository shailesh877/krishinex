const mongoose = require('mongoose');
const Order = require('./models/Order');

async function inspect() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/krishinex');
        const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5);
        console.log('--- Last 5 Orders ---');
        orders.forEach(o => {
            console.log(`ID: ${o._id}`);
            console.log(`Crop: ${o.crop}`);
            console.log(`Quantity (DB String): "${o.quantity}"`);
            console.log(`Price/Qtl: ${o.pricePerQuintal}`);
            console.log('-------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
