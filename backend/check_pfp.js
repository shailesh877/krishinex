const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ name: { $in: [/Akash/i, /Rajan/i] } });
    users.forEach(u => {
        console.log(`User: ${u.name}, Role: ${u.role}, PFP: ${u.profilePhotoUrl}`);
    });
    process.exit(0);
}
check();
