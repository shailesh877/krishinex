const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
require('dns').setServers(['8.8.8.8','1.1.1.1']);

const User = require('../models/User');

async function approveAdmin() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const result = await User.findOneAndUpdate(
        { email: 'pasiwaresocial@gmail.com', role: 'admin' },
        { status: 'approved' },
        { new: true }
    );
    if (result) {
        console.log('✅ Admin approved:', result.email, '| Status:', result.status);
    } else {
        console.log('❌ Admin not found');
    }
    process.exit(0);
}
approveAdmin().catch(e => { console.error(e.message); process.exit(1); });
