const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const SoilRequest = require('./backend/models/SoilRequest');
const User = require('./backend/models/User');

async function checkSoilPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const requests = await SoilRequest.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('farmer', 'name walletBalance')
            .populate('lab', 'labName walletBalance businessName');

        console.log('\n--- Recent Soil Requests ---');
        requests.forEach(r => {
            console.log(`ID: ${r._id.toString().slice(-6)} | Status: ${r.status} | Payment: ${r.paymentStatus} | Method: ${r.paymentMethod} | Price: ${r.price}`);
            console.log(`  Farmer: ${r.farmer?.name} (Bal: ${r.farmer?.walletBalance})`);
            console.log(`  Lab: ${r.lab?.labName || r.lab?.businessName} (Bal: ${r.lab?.walletBalance})`);
            console.log('---------------------------');
        });

        const admin = await User.findOne({ role: 'admin' });
        console.log(`\nAdmin Wallet Balance: ${admin?.walletBalance}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSoilPayments();
