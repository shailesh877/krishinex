const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function deepSearch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({
            $or: [
                { name: /Geeta|Khetify/i },
                { businessName: /Geeta|Khetify/i }
            ]
        }).lean();

        console.log('--- DEEP SEARCH RESULTS ---');
        console.log(JSON.stringify(users, null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
deepSearch();
