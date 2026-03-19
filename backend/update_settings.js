const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

async function update() {
    await mongoose.connect(process.env.MONGODB_URI);
    let settings = await Settings.getSettings();
    settings.pricing.walletDiscountPercentage = 5;
    await settings.save();
    console.log('--- Settings Updated ---');
    console.log(JSON.stringify(settings.pricing, null, 2));
    await mongoose.connection.close();
}

update();
