const mongoose = require('mongoose');
const Machine = require('./models/Machine');
const Rental = require('./models/Rental');
const User = require('./models/User');
require('dotenv').config();

async function createDummyMachineTask() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the test employee
        const employee = await User.findOne({ email: 'test@employee.com' });
        if (!employee) { console.error('Test employee not found!'); process.exit(1); }

        // 2. Find or create a dummy farmer
        let farmer = await User.findOne({ role: 'buyer' });
        if (!farmer) {
            farmer = new User({ role: 'buyer', name: 'Kisan Farmer', phone: '9876543210', address: 'Sonipat Village' });
            await farmer.save();
        }

        // 3. Create or reuse a Machine owned by employee
        let machine = await Machine.findOne({ owner: employee._id });
        if (!machine) {
            machine = new Machine({ owner: employee._id, name: 'Tractor + Rotavator', priceDay: 2000, priceHour: 600, desc: 'Heavy duty rotavator', distanceKm: 10, village: 'Karnal' });
            await machine.save();
            console.log('Created dummy machine: Tractor + Rotavator');
        }

        // 4. Create a dummy Rental (Machine Task)
        const rental = new Rental({
            machine: machine._id,
            owner: employee._id,
            buyer: farmer._id,
            fromDate: new Date(),
            toDate: new Date(Date.now() + 86400000), // tomorrow
            status: 'New'
        });
        await rental.save();

        console.log('✅ Dummy machine task created!');
        console.log('Machine:', machine.name);
        console.log('Farmer:', farmer.name, farmer.phone);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

createDummyMachineTask();
