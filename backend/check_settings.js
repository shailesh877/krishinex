const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const settings = await Settings.getSettings();
    console.log('--- Current Settings ---');
    console.log(JSON.stringify(settings.pricing, null, 2));
    await mongoose.connection.close();
}

check();
