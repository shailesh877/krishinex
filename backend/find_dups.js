const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function findDuplicatePhones() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const duplicates = await User.aggregate([
            {
                $group: {
                    _id: '$phone',
                    count: { $sum: 1 },
                    users: { $push: { id: '$_id', name: '$name', role: '$role' } }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const fs = require('fs');
        fs.writeFileSync('dups_result.json', JSON.stringify(duplicates, null, 2));
        console.log(`Saved ${duplicates.length} duplicate phone records to dups_result.json`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findDuplicatePhones();
