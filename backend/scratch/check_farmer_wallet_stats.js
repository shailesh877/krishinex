const mongoose = require('mongoose');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const User = require('../models/User');

async function checkBalances() {
    await mongoose.connect(process.env.MONGODB_URI);
    const farmers = await User.find({ role: { $in: ['farmer', 'buyer'] }, walletBalance: { $gt: 0 } }).select('name phone walletBalance status');
    console.log(farmers.map(f => ({ name: f.name, phone: f.phone, balance: f.walletBalance, status: f.status })));
    mongoose.connection.close();
}

checkBalances();
