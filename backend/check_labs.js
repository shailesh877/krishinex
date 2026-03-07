const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({
            $or: [
                { role: 'soil' },
                { soilDetails: { $exists: true } },
                { businessName: /lab/i }
            ]
        }).select('name role businessName soilDetails phone').lean();

        console.log('--- RELEVANT USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.name}`);
            console.log(`Role: ${u.role}`);
            console.log(`Business: ${u.businessName || 'N/A'}`);
            console.log(`Soil Details: ${JSON.stringify(u.soilDetails)}`);
            console.log('----------------------');
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkData();
