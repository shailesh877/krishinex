const mongoose = require('mongoose');
require('dotenv').config();

// DNS Fix (Bhai, cloud MongoDB ke liye DNS zaroori hai)
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const fixGeoAndIndex = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify_db';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const User = mongoose.connection.collection('users');

    // 1. Data Cleanup: Invalid locations ko default/null set karo
    console.log('Cleaning up invalid GeoJSON data...');
    
    // Users with missing coordinates or wrong location structure
    const invalidUsers = await User.find({
        $or: [
            { location: { $exists: false } },
            { "location.type": { $ne: "Point" } },
            { "location.coordinates": { $exists: false } },
            { "location.coordinates": { $size: 0 } }
        ]
    }).toArray();

    console.log(`Found ${invalidUsers.length} users with potentially invalid location data.`);

    if (invalidUsers.length > 0) {
        for (const u of invalidUsers) {
            await User.updateOne(
                { _id: u._id },
                { 
                    $set: { 
                        location: { 
                            type: "Point", 
                            coordinates: [83.00, 25.33] // Default to a safe area (Varanasi/General) or just any valid point
                        } 
                    } 
                }
            );
        }
        console.log('Fixed invalid location data.');
    }

    // 2. Drop existing geo indexes to avoid conflicts
    try {
        console.log('Dropping old geo indexes...');
        await User.dropIndex("location_2dsphere");
        await User.dropIndex("location.coordinates_2dsphere");
    } catch (e) {
        console.log('No old indexes to drop.');
    }

    // 3. Create the massive 2dsphere index on the parent location field
    console.log('Creating 2dsphere index on User.location...');
    await User.createIndex({ location: "2dsphere" });
    console.log('Index created successfully!');

    await mongoose.disconnect();
    console.log('Disconnected. Bhai, ab 500 error nahi aayega.');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL ERROR in maintenance script:', error);
    process.exit(1);
  }
};

fixGeoAndIndex();
