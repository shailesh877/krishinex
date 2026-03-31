const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify_db';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('Creating 2dsphere index on User.location...');
        await mongoose.connection.collection('users').createIndex({ location: "2dsphere" });
        console.log('Index created successfully');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error fixing indexes:', error);
    }
};

fixIndexes();
