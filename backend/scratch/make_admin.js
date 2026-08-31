const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const target = process.argv[2];

if (!target) {
    console.log('Usage: node scratch/make_admin.js <email_or_phone>');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const isEmail = target.includes('@');
    const query = isEmail ? { email: target } : { phone: target };

    const user = await User.findOne(query);
    if (!user) {
        console.error(`User not found with ${isEmail ? 'email' : 'phone'}: ${target}`);
        process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    console.log(`Success! User "${user.name || user.email || user.phone}" is now a Superadmin (role: 'admin').`);
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
