require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI;

async function checkUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ email: 'test@employee.com' });
        if (user) {
            console.log('--- USER DATA ---');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Password (plain):', user.password);
            console.log('-----------------');
        } else {
            console.log('User test@employee.com NOT FOUND');
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
}
checkUser();
