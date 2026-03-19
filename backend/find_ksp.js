const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function findKSP() {
    await mongoose.connect(process.env.MONGODB_URI);
    const ksps = await User.find({ role: 'ksp' });
    console.log('KSPs found:', ksps.map(k => ({ id: k._id, phone: k.phone, status: k.status, role: k.role })));
    const farmers = await User.find({ role: 'farmer' }).limit(3);
    console.log('Farmers found:', farmers.map(f => ({ id: f._id, phone: f.phone, role: f.role })));
    process.exit(0);
}

findKSP();
