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

        // User's exact coordinates from backend logs:
        const userLat = 24.7365296;
        const userLng = 82.8877827;

        // 1. Create/Update Machine at User's location
        const owner = await User.findOne({ status: 'approved' });
        if (!owner) {
            console.error("No approved owner found in DB!");
            process.exit(1);
        }

        await Machine.deleteMany({ name: "Test Machine (AT YOUR LOCATION)" });

        const testMachine = await Machine.create({
            owner: owner._id,
            name: "Test Machine (AT YOUR LOCATION)",
            priceDay: 1200,
            priceHour: 150,
            desc: "This is a test machine created exactly at your current GPS location to verify the 2 km filter.",
            category: "tractor",
            village: "Ghurma",
            location: {
                type: "Point",
                coordinates: [userLng, userLat] // [lng, lat]
            }
        });

        console.log(`\n✅ Created Test Machine:`);
        console.log(`- Name: ${testMachine.name}`);
        console.log(`- Location: ${JSON.stringify(testMachine.location)}`);

        // 2. Create/Update Labour at User's location
        await User.deleteMany({ name: "Test Labour (AT YOUR LOCATION)" });

        const testLabour = await User.create({
            name: "Test Labour (AT YOUR LOCATION)",
            phone: "8888888888",
            role: "labour",
            status: "approved",
            walletBalance: 100,
            address: "Ghurma, Sonbhadra, UP",
            location: {
                type: "Point",
                coordinates: [userLng, userLat]
            },
            labourDetails: {
                skills: "Tractor Driver, Harvester Operator, Pump repair",
                rateDay: 400,
                rateHour: 50,
                experience: 5
            }
        });

        console.log(`\n✅ Created Test Labour:`);
        console.log(`- Name: ${testLabour.name}`);
        console.log(`- Skills: ${testLabour.labourDetails.skills}`);
        console.log(`- Location: ${JSON.stringify(testLabour.location)}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
