const mongoose = require('mongoose');
const SoilRequest = require('./models/SoilRequest');
const User = require('./models/User');
require('dotenv').config();

async function createDummySoilTask() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the test employee (who acts as the soil lab)
        const employee = await User.findOne({ email: 'test@employee.com' });
        if (!employee) { console.error('Test employee not found!'); process.exit(1); }

        // 2. Find or create a dummy farmer
        let farmer = await User.findOne({ role: 'buyer' });
        if (!farmer) {
            farmer = new User({ role: 'buyer', name: 'Sanjay Farmer', phone: '9876543100', address: 'Karnal Village, Haryana' });
            await farmer.save();
        }

        // 3. Create a dummy Soil Test Request assigned to the employee
        const request = new SoilRequest({
            farmer: farmer._id,
            lab: employee._id,   // Employee acts as soil lab
            status: 'New',
            advisoryText: 'Test soil request for NPK analysis'
        });
        await request.save();

        console.log('✅ Dummy Soil Task created!');
        console.log('Farmer:', farmer.name, farmer.phone);
        console.log('Assigned to Employee:', employee.email);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

createDummySoilTask();
