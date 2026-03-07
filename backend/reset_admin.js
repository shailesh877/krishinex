const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function resetAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'admin@khetify.com';
        const newPassword = 'admin123';

        let user = await User.findOne({ email, role: 'admin' });
        if (user) {
            user.password = newPassword;
            await user.save();
            console.log(`Password for ${email} reset to: ${newPassword}`);
        } else {
            console.log('Admin not found. Creating new admin...');
            user = new User({
                role: 'admin',
                name: 'Super Admin',
                email: email,
                password: newPassword,
                phone: '0000000000',
                address: 'HQ'
            });
            await user.save();
            console.log(`New admin created with Email: ${email} and Password: ${newPassword}`);
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

resetAdmin();
