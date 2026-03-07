const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function findPotentialLabs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find users with soilDetails or businessName that sounds like a lab
        const potentialLabs = await User.find({
            $or: [
                { role: 'soil' },
                { 'soilDetails.testTypes': { $exists: true, $not: { $size: 0 } } },
                { businessName: /lab|soil|test/i }
            ]
        }).lean();

        console.log('Potential Labs:', JSON.stringify(potentialLabs, null, 2));

        // Also list all users and their roles to be sure
        const allUsers = await User.find({}).select('name role businessName soilDetails').lean();
        console.log('All Users:', JSON.stringify(allUsers, null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

findPotentialLabs();
