const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
require('dns').setServers(['8.8.8.8','1.1.1.1']);
const User = require('../models/User');

async function fixAdminRole() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    
    const user = await User.findOne({ email: 'pasiwaresocial@gmail.com' });
    if (!user) { console.log('User not found!'); process.exit(1); }
    
    console.log('Before - Role:', user.role, '| Status:', user.status);
    
    user.role = 'admin';
    user.status = 'approved';
    await user.save();
    
    console.log('✅ Fixed! Role:', user.role, '| Status:', user.status);
    console.log('Login: pasiwaresocial@gmail.com / 123456578');
    process.exit(0);
}
fixAdminRole().catch(e => { console.error(e.message); process.exit(1); });
