const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        const User = require('./models/User');
        try {
            await User.collection.dropIndex('email_1');
            console.log('Successfully dropped old email index');
        } catch (e) {
            console.log('Old email index might not exist: ', e.message);
        }

        await User.syncIndexes();
        console.log('Successfully synchronized new compound email index.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });
