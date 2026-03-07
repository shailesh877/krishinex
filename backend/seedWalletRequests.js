const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedWalletRequests = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify');
        console.log('Connected to MongoDB');

        const franchises = await User.find({ role: 'ksp' });

        if (franchises.length === 0) {
            console.log('No KSP franchises found. Run seedKsp.js first.');
            process.exit(0);
        }

        // Set first 2 franchises to PENDING
        for (let i = 0; i < Math.min(2, franchises.length); i++) {
            franchises[i].walletRechargeAmount = 25000 + (i * 10000);
            franchises[i].walletRechargeStatus = 'PENDING';
            await franchises[i].save();
            console.log(`Set ${franchises[i].businessName || franchises[i].name} to PENDING recharge of ₹${franchises[i].walletRechargeAmount}`);
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding wallet requests:', error);
        process.exit(1);
    }
};

seedWalletRequests();
