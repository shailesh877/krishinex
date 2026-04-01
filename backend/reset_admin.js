const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const resetAdminAccount = async () => {
    try {
        console.log('Connecting to MongoDB...');
        // Use a more robust connection for Atlas
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected successfully!');

        const newEmail = 'admin@krishinex.com';
        const newPasswordRaw = 'Nex@12345';
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPasswordRaw, salt);

        // Find any admin or specific one
        let admin = await User.findOne({ role: 'admin' });

        if (!admin) {
            console.log('No admin user found. Creating a new one...');
            admin = new User({
                role: 'admin',
                name: 'Super Admin',
                email: newEmail,
                password: hashedPassword,
                phone: '0000000000',
                address: 'Headquarters',
                status: 'approved'
            });
        } else {
            console.log(`Found existing admin: ${admin.email}. Updating credentials...`);
            admin.email = newEmail;
            admin.password = hashedPassword;
            // Clear any stale OTPs
            admin.loginOtp = '';
            admin.loginOtpExpiry = undefined;
        }

        await admin.save();

        console.log('-------------------------------------------');
        console.log('✅ Admin Account Reset Successful!');
        console.log(`Email: ${newEmail}`);
        console.log(`Password: ${newPasswordRaw}`);
        console.log('-------------------------------------------');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting admin account:', error);
        process.exit(1);
    }
};

resetAdminAccount();
