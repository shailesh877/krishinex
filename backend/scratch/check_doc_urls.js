const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const docs = await User.find({ 
        $or: [{ aadhaarDocUrl: { $ne: '' } }, { aadhaarBackDocUrl: { $ne: '' } }, { profilePhotoUrl: { $ne: '' } }] 
    }).select('name aadhaarDocUrl aadhaarBackDocUrl profilePhotoUrl labourDetails').limit(10).lean();

    console.log('Sample Document URLs from DB:');
    docs.forEach(d => {
        console.log(`User: ${d.name}`);
        console.log(`  aadhaarDocUrl: "${d.aadhaarDocUrl}"`);
        console.log(`  aadhaarBackDocUrl: "${d.aadhaarBackDocUrl}"`);
        console.log(`  profilePhotoUrl: "${d.profilePhotoUrl}"`);
        if (d.labourDetails) {
            console.log('  labourDetails:', d.labourDetails);
        }
    });

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
