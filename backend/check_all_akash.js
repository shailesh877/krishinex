const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function checkAllAkash() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ name: /Akash/i });
        console.log(`Found ${users.length} users with name matching Akash`);
        
        users.forEach(u => {
            console.log(`Name: ${u.name}, Phone: ${u.phone}, Role: ${u.role}, ID: ${u._id}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAllAkash();
