const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishi_nex';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const fs = require('fs');
        const admin = await User.findOne({ email: 'admin@khetify.com' });
        let result = '';
        if (admin) {
            result += 'Admin User Found:\n';
            result += `Role: ${admin.role}\n`;
            result += `Email: ${admin.email}\n`;
            result += `Password: ${admin.password}\n`;
            result += `Status: ${admin.status}\n`;
        } else {
            result += 'Admin user NOT found\n';
            const allAdmins = await User.find({ role: 'admin' });
            result += `Total Admin roles in DB: ${allAdmins.length}\n`;
            allAdmins.forEach(a => {
                result += `- ${a.email} (${a.password})\n`;
            });
        }
        fs.writeFileSync('check_results.txt', result);
        console.log('Results written to check_results.txt');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
