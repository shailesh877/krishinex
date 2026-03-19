require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        
        const machineIndexes = await mongoose.connection.db.collection('machines').indexes();
        console.log('Indexes on "machines":', JSON.stringify(machineIndexes, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
    
    process.exit(0);
}).catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
});
