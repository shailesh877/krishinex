
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Rental = require('../backend/models/Rental');
const LabourJob = require('../backend/models/LabourJob');
const User = require('../backend/models/User');

async function checkRecentBookings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify');
        console.log('Connected to MongoDB');

        console.log('\n--- RECENT RENTALS ---');
        const rentals = await Rental.find().sort({ createdAt: -1 }).limit(3).populate('machine owner buyer');
        rentals.forEach(r => {
            console.log(`ID: ${r._id}, Status: ${r.status}, Buyer: ${r.buyer?.name} (${r.buyer?._id}), Machine: ${r.machine?.name}, Amount: ${r.totalAmount}`);
        });

        console.log('\n--- RECENT LABOUR JOBS ---');
        const jobs = await LabourJob.find().sort({ createdAt: -1 }).limit(3).populate('labour farmer');
        jobs.forEach(j => {
            console.log(`ID: ${j._id}, Status: ${j.status}, Farmer: ${j.farmer?.name} (${j.farmer?._id}), Work: ${j.workType}, Amount: ${j.amount}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRecentBookings();
