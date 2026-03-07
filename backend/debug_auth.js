const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function debugAuth() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admins = await User.find({ role: 'admin' });
        console.log('--- DB ADMIN CHECK ---');
        if (admins.length === 0) {
            console.log('No users with role "admin" found.');
        } else {
            admins.forEach((a, i) => {
                console.log(`Admin #${i + 1}:`);
                console.log(`  _id:      ${a._id}`);
                console.log(`  email:    [${a.email}]`);
                console.log(`  password: [${a.password}]`);
                console.log(`  role:     [${a.role}]`);
            });
        }
        console.log('-----------------------');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Debug Error:', err.message);
    }
}

debugAuth();
