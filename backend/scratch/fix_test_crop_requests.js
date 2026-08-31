const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SellRequest = require('../models/SellRequest');
const User = require('../models/User');

async function run() {
    try {
        try {
            require('dns').setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            console.warn('DNS setServers failed:', dnsErr.message);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Find a valid farmer (preferably Pasiware or Yuvraj)
        const farmer = await User.findOne({ name: /Pasiware/i });
        if (!farmer) {
            console.log("Farmer Pasiware not found!");
            await mongoose.disconnect();
            return;
        }

        console.log(`Found farmer: ${farmer.name} (${farmer._id})`);

        // Update the two requests
        const res1 = await SellRequest.findByIdAndUpdate('6a0d9fb412ea291d2c3ae61e', {
            farmer: farmer._id,
            variety: 'Premium Local',
            expectedPrice: '11 / KG (₹1100 / Quintal)',
            notes: 'High quality dried Maize, ready for pickup.'
        }, { new: true });

        const res2 = await SellRequest.findByIdAndUpdate('6a0d9fb412ea291d2c3ae620', {
            farmer: farmer._id,
            variety: 'Hybrid Yellow',
            expectedPrice: '10 / KG (₹1000 / Quintal)',
            notes: 'Freshly harvested Maize with low moisture content.'
        }, { new: true });

        console.log("Updated request 1:", res1);
        console.log("Updated request 2:", res2);

        await mongoose.disconnect();
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
}

run();
