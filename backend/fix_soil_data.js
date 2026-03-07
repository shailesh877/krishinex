const mongoose = require('mongoose');
const User = require('./models/User');
const SoilRequest = require('./models/SoilRequest');
require('dotenv').config();

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the potential lab user (role: labour, has soilDetails)
        const labUser = await User.findOne({
            role: 'labour',
            'soilDetails.testTypes': { $exists: true }
        });

        if (!labUser) {
            console.log('No potential lab user found with role: labour and soilDetails.');
        } else {
            console.log(`Found potential lab user: ${labUser.name} (${labUser._id})`);

            // Fix the role
            labUser.role = 'soil';
            await labUser.save();
            console.log('Role updated to "soil" successfully.');

            // 2. Link orphaned SoilRequests to this lab
            const result = await SoilRequest.updateMany(
                { $or: [{ lab: null }, { lab: { $exists: false } }] },
                { $set: { lab: labUser._id } }
            );
            console.log(`Linked ${result.modifiedCount} orphaned SoilRequests to lab ${labUser.name}.`);
        }

        mongoose.connection.close();
        console.log('Finished.');
    } catch (err) {
        console.error('Error during data fix:', err);
    }
}

fixData();
