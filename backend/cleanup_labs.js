const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function cleanupLabs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Set Suresh Kumar as the official "Khetify Soil Lab"
        const suresh = await User.findOne({ name: 'Suresh Kumar' });
        if (suresh) {
            suresh.businessName = 'Khetify Soil Lab';
            suresh.status = 'approved'; // Ensure he is approved to show in API
            await suresh.save();
            console.log('Suresh Kumar updated to "Khetify Soil Lab" and approved.');
        }

        // 2. Cleanup Geeta Devi
        const geeta = await User.findOne({ name: 'Geeta Devi' });
        if (geeta) {
            geeta.businessName = 'Geeta Soil Testing';
            await geeta.save();
            console.log('Geeta Devi updated to "Geeta Soil Testing".');
        }

        // 3. Remove soil module from Shiva Singh (to remove the duplicate "Khetify Soil Lab")
        const shiva = await User.findOne({ name: 'Shiva Singh' });
        if (shiva) {
            shiva.businessName = 'Shiva Labour & Equipment'; // Give him a proper biz name
            shiva.employeeModules = shiva.employeeModules.filter(m => m !== 'soil');
            await shiva.save();
            console.log('Shiva Singh updated and soil module removed.');
        }

        mongoose.connection.close();
        console.log('Cleanup finished.');
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

cleanupLabs();
