const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const getAdminToken = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ email: 'admin@khetify.com' });
        if (admin) {
            const token = jwt.sign(
                { id: admin._id, role: admin.role },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '365d' }
            );
            console.log('---BEGINTOKEN---');
            console.log(token);
            console.log('---ENDTOKEN---');
        } else {
            console.log('Admin user not found');
        }
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

getAdminToken();
