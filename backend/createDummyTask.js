const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishinex';

async function createDummyTask() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the test employee
        const employee = await User.findOne({ email: 'test@employee.com' });
        if (!employee) {
            console.error('Test employee not found! Please run createEmployee.js first.');
            process.exit(1);
        }

        // 2. Find any user to act as the "Buyer" (Farmer)
        // If none exists, create a dummy farmer
        let farmer = await User.findOne({ role: 'buyer' });
        if (!farmer) {
            farmer = new User({
                role: 'buyer',
                name: 'Kisan Singh',
                phone: '9876543210',
                address: 'Dummy Village, Haryana'
            });
            await farmer.save();
            console.log('Created dummy farmer');
        }

        // 3. Create the dummy labour task (Order) assigned to the Employee
        const dummyOrder = new Order({
            buyer: farmer._id,
            assignedTo: employee._id, // Assign to employee
            farmerName: 'Ramu Kaka',
            farmerMobile: '9988776655',
            village: 'Sonipat',
            district: 'Sonipat',
            state: 'Haryana',
            crop: 'Wheat Harvesting', // Using crop as workType
            quantity: '5 Acres',
            location: 'Sonipat Fields',
            status: 'pending',     // overall status
            assignedStatus: 'new'  // employee status
        });

        await dummyOrder.save();
        console.log('✅ Successfully created a Dummy Labour Task assigned to test@employee.com');

        process.exit(0);
    } catch (error) {
        console.error('DB Error:', error);
        process.exit(1);
    }
}

createDummyTask();
