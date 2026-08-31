const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'yuvrajsingh7355091011@gmail.com';
        const user = await User.findOne({ email: email });

        if (!user) {
            console.log(`User with email ${email} not found.`);
        } else {
            console.log('User found:');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Password (Raw/Hashed):', user.password);
            console.log('Status:', user.status);
            console.log('Full User:', JSON.stringify(user, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
