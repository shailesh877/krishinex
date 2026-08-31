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

        const machines = await Machine.find({}).populate('owner', 'name status');
        console.log(`\nFound ${machines.length} machines in database:`);
        
        machines.forEach((m, idx) => {
            console.log(`\n[${idx + 1}] Machine ID: ${m._id}`);
            console.log(`Name: ${m.name}`);
            console.log(`Owner: ${m.owner ? m.owner.name : 'N/A'} (Status: ${m.owner ? m.owner.status : 'N/A'})`);
            console.log(`Location: ${JSON.stringify(m.location)}`);
            console.log(`village: ${m.village}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
