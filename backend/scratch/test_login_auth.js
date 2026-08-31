const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('../models/User');

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const email = 'pasiwaresocial@gmail.com';
        const password = '123456578';

        const user = await User.findOne({
            email,
            role: { $in: ['employee', 'admin', 'field_executive'] }
        });

        if (!user) {
            console.error('❌ User not found for admin login!');
            process.exit(1);
        }

        console.log('Found user:', {
            id: user._id,
            name: user.name,
            role: user.role,
            email: user.email,
            status: user.status
        });

        let isMatch = false;
        if (user.password.startsWith('$2') || user.password.length > 30) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (isMatch) {
            console.log('✅ Password match success!');
        } else {
            console.error('❌ Password match failed!');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error during test:', err);
    }
}

testLogin();
