require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    
    try {
        console.log('Dropping index: location.coordinates_2dsphere');
        await mongoose.connection.db.collection('machines').dropIndex('location.coordinates_2dsphere');
        console.log('Index dropped!');
    } catch (err) {
        console.log('Could not drop index (might already be gone):', err.message);
    }
    
    process.exit(0);
}).catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
});
