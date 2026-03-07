const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const roles = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        console.log('Role Counts:', JSON.stringify(roles, null, 2));

        const recentLabourers = await User.find({ role: { $in: ['labour', 'worker'] } })
            .select('name role phone createdAt status')
            .sort({ createdAt: -1 })
            .limit(5);
        console.log('Recent Labourers/Workers:', JSON.stringify(recentLabourers, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
