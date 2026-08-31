const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    
    // Check all roles in User collection
    const roles = await User.distinct('role');
    console.log('Distinct roles in User collection:', roles);

    // Count by role
    for (const r of roles) {
        const count = await User.countDocuments({ role: r });
        console.log(`Role "${r}": ${count} users`);
    }

    // Check users with labourDetails
    const withLabourDetails = await User.countDocuments({ labourDetails: { $exists: true } });
    console.log(`Users with labourDetails: ${withLabourDetails}`);

    // Check sample labour users
    const sampleLabour = await User.find({ $or: [{ role: 'labour' }, { role: 'labourer' }, { labourDetails: { $exists: true } }] }).limit(5).lean();
    console.log('Sample Labour Users:', sampleLabour.map(u => ({ _id: u._id, name: u.name, phone: u.phone, role: u.role, status: u.status, labourDetails: u.labourDetails })));

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
