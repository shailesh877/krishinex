
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function findAnything(q) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ phone: { $regex: q } });
        console.log('Users with phone matching', q, ':', users.length);
        console.log(users.map(u => ({ name: u.name, phone: u.phone, role: u.role })));
        await mongoose.connection.close();
    } catch (e) { console.error(e); }
}

findAnything('9793');
