const mongoose = require('mongoose');
const User = require('./models/User');
const SoilRequest = require('./models/SoilRequest');
require('dotenv').config();

async function forceLink() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const suresh = await User.findOne({ name: 'Suresh Kumar' });
        if (suresh) {
            const result = await SoilRequest.updateMany({}, { $set: { lab: suresh._id } });
            console.log(`Successfully linked ${result.modifiedCount} requests to ${suresh.name}`);
        } else {
            console.log('Suresh NOT FOUND');
        }
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
forceLink();
