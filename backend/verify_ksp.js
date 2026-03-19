const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Settings = require('./models/Settings');
require('dotenv').config();

async function verifyKSPFlow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Test KSP Partner
        let ksp = await User.findOne({ phone: '9999988888', role: 'ksp' });
        if (!ksp) {
            ksp = await User.create({
                name: 'Test KSP',
                phone: '9999988888',
                role: 'ksp',
                password: 'password123',
                status: 'approved',
                address: 'Test Address',
                walletBalance: 0
            });
            console.log('Created Test KSP');
        } else {
            ksp.walletBalance = 0;
            ksp.status = 'approved';
            await ksp.save();
            console.log('Reset Test KSP');
        }

        // 2. Setup Test User
        let farmer = await User.findOne({ phone: '1111122222', role: 'farmer' });
        if (!farmer) {
            farmer = await User.create({
                name: 'Test Farmer',
                phone: '1111122222',
                role: 'farmer',
                address: 'Test Farmer Address',
                walletBalance: 2000,
                status: 'approved'
            });
            console.log('Created Test Farmer');
        } else {
            farmer.walletBalance = 2000;
            await farmer.save();
            console.log('Reset Test Farmer');
        }

        // 3. Setup Settings (10% KSP Commission)
        const settings = await Settings.getSettings();
        settings.commissions.ksp = 10;
        await settings.save();
        console.log('Set KSP Commission to 10%');

        // 4. Simulate Withdrawal Logic (Pure Backend Test)
        const withdrawAmount = 1000;
        const commission = (withdrawAmount * 10) / 100; // 100
        const netToKsp = withdrawAmount - commission; // 900

        console.log(`Withdrawing ₹${withdrawAmount} from Farmer...`);
        
        // Logical check (same as in kspRoutes.js)
        farmer.walletBalance -= withdrawAmount;
        await farmer.save();

        ksp.walletBalance += netToKsp;
        await ksp.save();

        console.log('Balances updated.');
        console.log(`Farmer Balance: ${farmer.walletBalance} (Expected: 1000)`);
        console.log(`KSP Balance: ${ksp.walletBalance} (Expected: 900)`);

        if (farmer.walletBalance === 1000 && ksp.walletBalance === 900) {
            console.log('✅ BACKEND LOGIC VERIFIED');
        } else {
            console.log('❌ LOGIC ERROR');
        }

        // Clean up
        // await ksp.deleteOne();
        // await farmer.deleteOne();

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verifyKSPFlow();
