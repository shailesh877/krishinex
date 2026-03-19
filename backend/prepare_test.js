const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function prepareData() {
    await mongoose.connect(process.env.MONGODB_URI);
    // Approve the test KSP
    await User.updateOne({ phone: '9999988888', role: 'ksp' }, { status: 'approved', password: 'password123' });
    const farmer = await User.findOne({ phone: '9648022011', role: 'farmer' });
    console.log('Farmer ID for 9648022011:', farmer._id.toString());
    process.exit(0);
}

prepareData();
