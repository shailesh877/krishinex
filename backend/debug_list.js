const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function listEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ role: 'employee' });
        console.log(`Found ${users.length} employees:`);
        users.forEach(u => console.log(`- ${u.email} (Modules: ${u.employeeModules || 'none'})`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listEmployees();
