const mongoose = require('mongoose');
const Rental = require('./models/Rental');
const LabourJob = require('./models/LabourJob');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI; // Use environment variable

async function debug() {
    await mongoose.connect(dbUri);
    console.log('Connected to DB');

    const rentals = await Rental.find({ status: { $ne: 'Cancelled' } }).select('machine status fromDate toDate').lean();
    console.log('--- RENTALS ---');
    rentals.forEach(r => {
        console.log(`Machine: ${r.machine}, Status: ${r.status}, From: ${r.fromDate}, To: ${r.toDate}`);
    });

    const jobs = await LabourJob.find({ status: { $ne: 'Cancelled' } }).select('labour status fromDate toDate').lean();
    console.log('--- LABOUR JOBS ---');
    jobs.forEach(j => {
        console.log(`Labour: ${j.labour}, Status: ${j.status}, From: ${j.fromDate}, To: ${j.toDate}`);
    });

    process.exit(0);
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
