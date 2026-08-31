const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function checkAdmins() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Listing all admin users...');
        const admins = await User.find({ role: 'admin' }).lean();
        console.log(`Found ${admins.length} admins:`);
        admins.forEach(admin => {
            console.log({
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                status: admin.status,
                employeeCode: admin.employeeCode,
                employeeModules: admin.employeeModules
            });
        });

        await mongoose.connection.close();
        console.log('Connection closed.');
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAdmins();
