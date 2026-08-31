const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function listAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admins = await User.find({ role: 'admin' });
        console.log(`Found ${admins.length} admins:`);
        admins.forEach(a => {
            console.log(`- ${a.email} (${a.name}) | Status: ${a.status}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listAdmins();
