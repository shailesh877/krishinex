require('dotenv').config();
const mongoose = require('mongoose');

// Define a temporary schema to handle the transition
const machineSchema = new mongoose.Schema({
    latitude: Number,
    longitude: Number,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}, { strict: false });

const Machine = mongoose.model('Machine', machineSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    
    // Find machines that have latitude/longitude but no location.coordinates
    const machines = await Machine.find({
        $or: [
            { 'location.coordinates': { $exists: false } },
            { 'location.coordinates': { $size: 0 } }
        ]
    });
    
    console.log(`Found ${machines.length} machines to migrate.`);
    
    for (const machine of machines) {
        if (machine.latitude && machine.longitude) {
            machine.location = {
                type: 'Point',
                coordinates: [Number(machine.longitude), Number(machine.latitude)]
            };
            await machine.save();
            console.log(`Migrated machine: ${machine._id} (${machine.latitude}, ${machine.longitude})`);
        } else {
            console.log(`Machine ${machine._id} has no latitude/longitude data.`);
        }
    }
    
    console.log('Migration complete!');
    process.exit(0);
}).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
