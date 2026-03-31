const mongoose = require('mongoose');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const Location = require('./models/Location');

const initialData = [
    {
        state: 'Haryana',
        districts: ['Karnal', 'Panipat', 'Sonipat', 'Ambala', 'Hisar', 'Rohtak', 'Gurgaon', 'Faridabad']
    },
    {
        state: 'Punjab',
        districts: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali']
    },
    {
        state: 'Uttar Pradesh',
        districts: ['Lucknow', 'Kanpur', 'Agra', 'Meerut', 'Varanasi', 'Prayagraj', 'Ghaziabad']
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const data of initialData) {
            await Location.findOneAndUpdate(
                { state: data.state },
                { $set: { districts: data.districts, status: 'active' } },
                { upsert: true, new: true }
            );
            console.log(`Seeded ${data.state}`);
        }

        console.log('Seeding completed');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
