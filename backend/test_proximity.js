const mongoose = require('mongoose');
const User = require('./models/User');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

async function testProximity() {
    try {
        await mongoose.connect('mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority');
        console.log('Connected to DB');

        // Test coordinates (e.g., from a user who might be testing)
        // Let's use some coordinates from the DB as a reference if possible
        const allApproved = await User.find({ role: 'labour', status: 'approved' });
        console.log(`\nFound ${allApproved.length} approved labourers.`);
        
        const testLat = 26.8467;
        const testLng = 80.9462;
        const radiusKm = 1000; // Large radius to find someone
        console.log(`\n--- TEST 1: Large Radius (1000km) ---`);
        const results1 = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [testLng, testLat] },
                    distanceField: 'distanceKm',
                    maxDistance: radiusKm * 1000,
                    query: { role: 'labour', status: 'approved' },
                    spherical: true,
                    distanceMultiplier: 0.001
                }
            }
        ]);
        console.log(`Results within 1000km: ${results1.length}`);
        results1.forEach(r => console.log(`- ${r.name}: ${r.distanceKm.toFixed(2)}km`));

        console.log(`\n--- TEST 2: Small Radius (2km) ---`);
        const results2 = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [testLng, testLat] },
                    distanceField: 'distanceKm',
                    maxDistance: 2 * 1000,
                    query: { role: 'labour', status: 'approved' },
                    spherical: true,
                    distanceMultiplier: 0.001
                }
            }
        ]);
        console.log(`Results within 2km: ${results2.length}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testProximity();
