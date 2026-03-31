require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const testPrice = 777; // Random test price
        console.log('Testing with price:', testPrice);
        
        const updateObj = { 'pricing.soilTestPrice': testPrice };
        const updated = await Settings.findOneAndUpdate({}, { $set: updateObj }, { new: true, upsert: true });
        
        console.log('Result in DB:', updated.pricing.soilTestPrice);
        if (updated.pricing.soilTestPrice === testPrice) {
            console.log('SUCCESS: DB update works!');
        } else {
            console.log('FAILURE: DB update failed!');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
