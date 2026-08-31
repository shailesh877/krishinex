const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('../models/User');

async function updateSuperadmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('Connected!');

        const email = 'pasiwaresocial@gmail.com';
        const rawPassword = '123456578';

        // Find specifically the admin user with this email
        let adminUser = await User.findOne({ email: email, role: 'admin' });

        if (!adminUser) {
            console.log(`No admin user found with email ${email}. Creating a new one...`);
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            adminUser = new User({
                role: 'admin',
                name: 'KrishiNex Super Admin',
                email: email,
                phone: '7355188392', // matching Savita Patel's phone or a new admin phone
                status: 'approved',
                password: hashedPassword,
                address: 'KrishiNex Operations',
                employeeModules: ['labour', 'equipment', 'soil', 'doctor', 'shop', 'ksp', 'users', 'finance', 'analytics'],
                employeeCode: 'ADMIN-002'
            });
        } else {
            console.log(`Found existing admin user: ${adminUser.name}. Updating credentials and permissions...`);
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            adminUser.password = hashedPassword;
            adminUser.status = 'approved';
            adminUser.employeeModules = ['labour', 'equipment', 'soil', 'doctor', 'shop', 'ksp', 'users', 'finance', 'analytics'];
            if (!adminUser.employeeCode) {
                adminUser.employeeCode = 'ADMIN-002';
            }
        }

        await adminUser.save();
        console.log('----------------------------------------------------');
        console.log('✅ Super Admin Updated Successfully!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${rawPassword}`);
        console.log(`Modules: ${adminUser.employeeModules.join(', ')}`);
        console.log('----------------------------------------------------');

        // Restore farmer password or status if needed, but let's check if the farmer had any password
        const farmerUser = await User.findOne({ email: email, role: 'farmer' });
        if (farmerUser) {
            console.log(`Note: Also found a farmer user with email ${email}.`);
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating super admin:', error);
        process.exit(1);
    }
}

updateSuperadmin();
