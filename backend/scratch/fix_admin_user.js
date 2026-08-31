const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function updateUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'yuvrajsingh7355091011@gmail.com';
        const password = '123456578'; // As provided by user

        let user = await User.findOne({ email: email });

        if (!user) {
            console.log(`User ${email} not found. Creating new admin.`);
            user = new User({
                email: email,
                name: 'Yuvraj Singh (Admin)',
                role: 'admin',
                status: 'approved'
            });
        } else {
            console.log(`User ${email} found with role ${user.role}. Updating to admin.`);
            user.role = 'admin';
            user.status = 'approved';
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        console.log(`User ${email} updated/created successfully as admin.`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateUser();
