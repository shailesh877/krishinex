const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find users with multiple entries for same phone but different roles
        const multiRole = await User.aggregate([
            { $group: { _id: "$phone", count: { $sum: 1 }, roles: { $push: "$role" }, names: { $push: "$name" } } },
            { $match: { count: { $gt: 1 } } },
            { $limit: 5 }
        ]);
        console.log('Users with multiple roles/profiles for same phone:');
        console.log(JSON.stringify(multiRole, null, 2));

        const partners = await User.find({
            role: { $in: ['equipment', 'soil', 'shop', 'ksp', 'labour'] }
        }).limit(5).select('name phone role');
        console.log('Sample Partners found:', partners);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
