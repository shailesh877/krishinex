try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB.');
        const users = await User.find({}, 'name phone role fcmToken');
        console.log(`Total users in DB: ${users.length}`);
        users.forEach(u => {
            console.log(`Name: ${u.name}, Phone: ${u.phone}, Role: ${u.role}, FCM Token: ${u.fcmToken ? u.fcmToken.substring(0, 30) + '...' : 'NULL'}`);
        });
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
