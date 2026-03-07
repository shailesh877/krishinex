const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Crop = require('./models/Crop');

dotenv.config();

const crops = [
    { name: 'Wheat', hindiName: 'गेहूं', icon: '🌾' },
    { name: 'Rice', hindiName: 'धान', icon: '🍚' },
    { name: 'Mustard', hindiName: 'सरसों', icon: '🌿' }
];

const seedCrops = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const crop of crops) {
            await Crop.findOneAndUpdate(
                { name: crop.name },
                crop,
                { upsert: true, new: true }
            );
            console.log(`Seeded crop: ${crop.name}`);
        }

        console.log('Seeding completed');
        process.exit();
    } catch (e) {
        console.error('Seeding error:', e);
        process.exit(1);
    }
};

seedCrops();
