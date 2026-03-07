const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function listEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const employees = await User.find({ role: 'employee' }).select('name businessName employeeModules status phone').lean();
        console.log('--- ALL EMPLOYEES ---');
        console.log(JSON.stringify(employees, null, 2));
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
listEmployees();
