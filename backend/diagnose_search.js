
const mongoose = require('mongoose');
require('dotenv').config();

async function runDiagnostics() {
    console.log('--- BACKEND DIAGNOSTICS ---');
    
    // 1. Check modules
    try {
        require('bcryptjs');
        console.log('✅ bcryptjs loaded');
        require('jsonwebtoken');
        console.log('✅ jsonwebtoken loaded');
    } catch (e) {
        console.error('❌ Module load failed:', e.message);
    }

    // 2. Check DB
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const User = require('./models/User');
        const count = await User.countDocuments();
        console.log(`✅ User count: ${count}`);
        
        // 3. Test Search Logic
        const query = '9793'; // From the screenshot
        const mongoQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { businessName: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } }
            ],
            role: { $in: ['farmer', 'machine_partner', 'labour', 'buyer', 'ksp', 'field_executive'] }
        };
        
        const users = await User.find(mongoQuery).limit(5).lean();
        console.log(`✅ Search test returned ${users.length} results`);
        
        await mongoose.disconnect();
    } catch (e) {
        console.error('❌ DB/Query Error:', e.message);
    }
}

runDiagnostics();
