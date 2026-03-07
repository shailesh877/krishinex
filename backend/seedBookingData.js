const mongoose = require('mongoose');
require('dotenv').config();
const Machine = require('./models/Machine');
const User = require('./models/User');

const seedBookingData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create/Find an owner for Machines
        let machineOwner = await User.findOne({ phone: '9648022011', role: 'farmer' });
        if (!machineOwner) {
            machineOwner = await User.findOne({ role: 'farmer' });
        }

        if (!machineOwner) {
            console.log('No farmer found to own machines. Please register first.');
            process.exit(1);
        }

        // 2. Seed Machines
        const machines = [
            {
                owner: machineOwner._id,
                name: 'Tractor 50 HP (Mahindra)',
                priceDay: 800,
                priceHour: 100,
                desc: 'Powerful tractor for all farm work. 50 HP engine.',
                distanceKm: 2.5,
                village: 'Karnal',
                category: 'tractor',
                images: ['https://i.ibb.co/9rQk7Xy/tractor.png']
            },
            {
                owner: machineOwner._id,
                name: 'Combine Harvester',
                priceDay: 2500,
                priceHour: 300,
                desc: 'Best for wheat and rice harvesting. High efficiency.',
                distanceKm: 5.2,
                village: 'Panipat',
                category: 'harvester',
                images: ['https://i.ibb.co/Qd2Zx5K/harvester.png']
            },
            {
                owner: machineOwner._id,
                name: 'Power Sprayer 20L',
                priceDay: 150,
                priceHour: 20,
                desc: 'Easy and safe pesticide spraying. Battery operated.',
                distanceKm: 1.2,
                village: 'Gharaunda',
                category: 'pump',
                images: ['https://i.ibb.co/kX8Qj9P/sprayer.png']
            }
        ];

        await Machine.deleteMany({}); // Optional: clear existing
        await Machine.insertMany(machines);
        console.log('Machines seeded successfully');

        // 3. Seed Labour (Users with role 'labour')
        const labourers = [
            {
                role: 'labour',
                name: 'Ramu Yadav',
                phone: '9999911111',
                address: 'Worker Colony, Panipat',
                status: 'approved',
                labourDetails: {
                    skills: ['Harvesting', 'Weeding'],
                    availability: 'active',
                    jobsCompleted: 15,
                    rating: 4.8
                },
                maxDistanceKm: 10,
                ratePerDay: 500,
                ratePerHour: 80
            },
            {
                role: 'labour',
                name: 'Shiva Singh',
                phone: '9999922222',
                address: 'Main Chowk, Karnal',
                status: 'approved',
                labourDetails: {
                    skills: ['Loading', 'Driving'],
                    availability: 'active',
                    jobsCompleted: 24,
                    rating: 4.5
                },
                maxDistanceKm: 15,
                ratePerDay: 600,
                ratePerHour: 100
            }
        ];

        // Since role + phone is unique, we find and update or insert
        for (const l of labourers) {
            await User.findOneAndUpdate(
                { phone: l.phone, role: 'labour' },
                l,
                { upsert: true, new: true }
            );
        }
        console.log('Labourers seeded successfully');

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedBookingData();
