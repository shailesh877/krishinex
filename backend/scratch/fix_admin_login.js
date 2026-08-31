const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
require('dns').setServers(['8.8.8.8','1.1.1.1']);
const User = require('../models/User');

async function fixAdmin() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    
    const user = await User.findOne({ email: 'pasiwaresocial@gmail.com' });
    if (!user) { console.log('User not found!'); process.exit(1); }
    
    console.log('Found user:', user.email, '| Role:', user.role, '| Status:', user.status);
    console.log('Stored password (first 10 chars):', user.password?.substring(0, 10));
    
    // Check if 123456578 matches
    let match = false;
    if (user.password && (user.password.startsWith('$2') || user.password.length > 30)) {
        match = await bcrypt.compare('123456578', user.password);
        console.log('bcrypt match for 123456578:', match);
    } else {
        match = user.password === '123456578';
        console.log('plain match for 123456578:', match);
    }
    
    if (!match) {
        // Reset the password
        const hashed = await bcrypt.hash('123456578', 10);
        user.password = hashed;
        user.status = 'approved';
        await user.save();
        console.log('✅ Password reset to: 123456578 and status set to approved');
    } else {
        console.log('Password already correct! Ensuring status=approved...');
        user.status = 'approved';
        await user.save();
    }
    process.exit(0);
}
fixAdmin().catch(e => { console.error(e.message); process.exit(1); });
