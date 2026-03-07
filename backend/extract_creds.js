const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const fs = require('fs');

async function extractCreds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            const data = {
                email: admin.email,
                password: admin.password,
                role: admin.role
            };
            fs.writeFileSync('creds_final.json', JSON.stringify(data, null, 2));
            console.log('Creds saved to creds_final.json');
        } else {
            console.log('No admin found.');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

extractCreds();
