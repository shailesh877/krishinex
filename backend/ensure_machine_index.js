require('dotenv').config();
const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] }
    }
}, { strict: false });

const Machine = mongoose.model('Machine', machineSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    
    try {
        console.log('Attempting to create 2dsphere index on location...');
        await Machine.collection.createIndex({ location: '2dsphere' });
        console.log('Index created successfully!');
    } catch (err) {
        console.error('Failed to create index:', err);
        if (err.code === 16755) {
            console.log('Searching for invalid coordinates...');
            const invalid = await Machine.find({
                $or: [
                    { 'location.coordinates': { $exists: false } },
                    { 'location.coordinates': { $size: 0 } },
                    { 'location.type': { $ne: 'Point' } }
                ]
            });
            console.log(`Found ${invalid.length} documents with invalid or missing location data.`);
            for (const doc of invalid) {
                console.log(`ID: ${doc._id}, Location: ${JSON.stringify(doc.location)}`);
            }
        }
    }
    
    process.exit(0);
}).catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
});
