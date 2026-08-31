const mongoose = require('mongoose');
require('dotenv').config();

// DNS Fix for MongoDB SRV on some networks
try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed (skipping):', e.message);
}

const Machine = require('../models/Machine');
const User = require('../models/User');

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        // Find an approved owner
        const owner = await User.findOne({ status: 'approved' });
        if (!owner) {
            console.error("No approved owner found in DB!");
            process.exit(1);
        }
        console.log(`Using owner: ${owner.name} (${owner._id})`);

        // Coordinates for exactly 15 km away from user's current location (25.3645109, 83.0060902)
        // 0.135 degrees north of user is approx 15 km
        const farLat = 25.3645109 + 0.135;
        const farLng = 83.0060902;

        // Delete any existing test machine first to keep it clean
        await Machine.deleteMany({ name: "Test Machine (15 KM AWAY)" });

        const testMachine = await Machine.create({
            owner: owner._id,
            name: "Test Machine (15 KM AWAY)",
            priceDay: 1500,
            priceHour: 200,
            desc: "This is a test machine created exactly 15 km away to verify the distance filter.",
            category: "tractor",
            village: "Far Village",
            location: {
                type: "Point",
                coordinates: [farLng, farLat] // [lng, lat]
            }
        });

        console.log(`\n✅ Successfully created Test Machine:`);
        console.log(`Name: ${testMachine.name}`);
        console.log(`Location: ${JSON.stringify(testMachine.location)}`);
        console.log(`This machine is exactly 15 km away from you.`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
