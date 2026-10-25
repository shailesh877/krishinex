const path = require('path');
const backendModules = path.join(__dirname, '../backend/node_modules');
const mongoose = require(path.join(backendModules, 'mongoose'));
const bcrypt = require(path.join(backendModules, 'bcryptjs'));
require(path.join(backendModules, 'dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('../backend/models/User');

async function createOrUpdateAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('Connected!');

        const email = 'mauryaneeraj718@gmail.com'.toLowerCase().trim();
        const rawPassword = '12345678';

        let user = await User.findOne({ email });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const modules = [
            'labour',
            'equipment',
            'soil',
            'doctor',
            'shop',
            'ksp',
            'users',
            'finance',
            'analytics',
            'milk'
        ];

        // Find the latest employeeCode for ADMIN to generate a unique one
        const admins = await User.find({ employeeCode: { $regex: /^ADMIN-/ } }).sort({ employeeCode: -1 });
        let nextNum = 1;
        admins.forEach(a => {
            const m = a.employeeCode && a.employeeCode.match(/^ADMIN-(\d+)/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n >= nextNum) nextNum = n + 1;
            }
        });
        const generatedCode = `ADMIN-${String(nextNum).padStart(3, '0')}`;
        console.log(`Using Employee Code: ${generatedCode}`);

        if (user) {
            console.log(`User found with email ${email}. Updating to superadmin (role: 'admin')...`);
            user.role = 'admin';
            user.password = hashedPassword;
            user.status = 'approved';
            user.employeeModules = modules;
            if (!user.name) user.name = 'Neeraj Maurya';
            if (!user.address) user.address = 'KrishiNex HQ';
            if (!user.phone) user.phone = '9876543210';
            if (!user.employeeCode) user.employeeCode = generatedCode;
            await user.save();
        } else {
            console.log(`No user found with email ${email}. Creating new Superadmin...`);
            user = new User({
                role: 'admin',
                name: 'Neeraj Maurya',
                email: email,
                phone: '9876543210',
                status: 'approved',
                password: hashedPassword,
                address: 'KrishiNex Operations',
                employeeModules: modules,
                employeeCode: generatedCode
            });
            await user.save();
        }

        console.log('----------------------------------------------------');
        console.log('✅ Super Admin Configured Successfully!');
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Employee Code: ${user.employeeCode}`);
        console.log(`Status: ${user.status}`);
        console.log(`Modules: ${user.employeeModules.join(', ')}`);
        console.log('----------------------------------------------------');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating/updating admin:', err);
        process.exit(1);
    }
}

createOrUpdateAdmin();
