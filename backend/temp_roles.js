const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function getRoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const roles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
        console.log(JSON.stringify(roles, null, 2));
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
getRoles();
