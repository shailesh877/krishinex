const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: /emp02/i });
        if (!user) {
            console.log('User emp02 not found');
        } else {
            console.log('User Found:');
            console.log('ID:', user._id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Modules:', user.employeeModules);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
