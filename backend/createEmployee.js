// createEmployee.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path if needed

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishinex';

async function createDummyEmployee() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Upsert dummy employee to ensure credentials and schema fields are always correct
        const employeeData = {
            role: 'employee',
            name: 'Test Employee',
            email: 'test@employee.com',
            phone: '9999999999',
            address: 'KrishiNex HQ',
            password: 'password123',
            status: 'approved',
            employeeCode: 'EMP-9999',
            employeeModules: ['labour', 'equipment', 'soil', 'doctor']
        };

        const employee = await User.findOneAndUpdate(
            { email: 'test@employee.com' },
            employeeData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('✅ Dummy employee synchronized successfully!');
        console.log('Email: test@employee.com\nPassword: password123');
    } catch (error) {
        console.error('Error creating employee:', error);
    } finally {
        mongoose.connection.close();
    }
}

createDummyEmployee();
