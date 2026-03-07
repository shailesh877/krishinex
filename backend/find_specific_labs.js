const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function findLabs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({
            $or: [
                { name: /Geeta|Khetify/i },
                { businessName: /Geeta|Khetify/i },
                { role: 'employee', employeeModules: 'soil' }
            ]
        }).select('name businessName role employeeModules status phone').lean();

        console.log('--- FOUND LAB USERS ---');
        console.log(JSON.stringify(users, null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
findLabs();
