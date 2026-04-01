const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const phone = '9648022011';
    const users = await User.find({ phone: new RegExp(phone) });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Phone: ${u.phone}`);
    });
    
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
