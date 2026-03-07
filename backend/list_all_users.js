const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}).select('name businessName role employeeModules status phone').lean();
        console.log('--- ALL USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u._id} | Name: ${u.name} | Biz: ${u.businessName || 'N/A'} | Role: ${u.role} | Modules: ${u.employeeModules || '[]'} | Status: ${u.status}`);
        });
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
listUsers();
