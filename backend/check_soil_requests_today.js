require('dotenv').config();
const mongoose = require('mongoose');
const SoilRequest = require('./models/SoilRequest');
const User = require('./models/User');

async function checkReqs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const today = new Date('2026-03-07');
        today.setHours(0, 0, 0, 0);

        const reqs = await SoilRequest.find({
            createdAt: { $gte: today }
        }).populate('farmer lab');

        console.log('--- SOIL REQUESTS FROM TODAY (MARCH 7, 2026) ---');
        console.log('Total found:', reqs.length);

        reqs.forEach((r, i) => {
            console.log(`\n[${i + 1}] Request ID: ${r._id}`);
            console.log(`    Farmer: ${r.farmer ? r.farmer.name : 'Unknown'} (${r.farmer ? r.farmer.phone : 'N/A'})`);
            console.log(`    Lab: ${r.lab ? (r.lab.businessName || r.lab.name) : 'Unknown'}`);
            console.log(`    Test Type: ${r.testType}`);
            console.log(`    Price: ${r.price}`);
            console.log(`    Status: ${r.status}`);
            console.log(`    Created At: ${r.createdAt}`);
        });

        const allReqs = await SoilRequest.countDocuments();
        console.log('\nTotal Soil Requests in DB:', allReqs);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkReqs();
