require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const all = await Settings.find();
        console.log('Total settings docs:', all.length);
        console.log('Docs data:', JSON.stringify(all, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
