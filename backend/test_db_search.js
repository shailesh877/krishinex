
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function testSearch(query) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const mongoQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { businessName: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } }
            ],
            role: { $in: ['farmer', 'machine_partner', 'labour', 'buyer', 'ksp', 'field_executive'] }
        };

        console.log('Running query:', JSON.stringify(mongoQuery, null, 2));
        const users = await User.find(mongoQuery)
            .select('name businessName phone role address walletBalance')
            .limit(20)
            .lean();

        console.log('Results count:', users.length);
        console.log('Results:', JSON.stringify(users, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error('SEARCH ERROR:', err);
        process.exit(1);
    }
}

testSearch('9793');
