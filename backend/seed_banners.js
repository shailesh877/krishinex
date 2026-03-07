const mongoose = require('mongoose');
const Banner = require('./models/Banner');
require('dotenv').config();

const banners = [
    {
        image: 'https://images.pexels.com/photos/2132180/pexels-photo-2132180.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        title: 'Special Discount on Seeds',
        link: 'seed',
        active: true
    },
    {
        image: 'https://images.pexels.com/photos/259280/pexels-photo-259280.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        title: 'Best Pesticides for your Crops',
        link: 'pesticide',
        active: true
    },
    {
        image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        title: 'Modern Farming Equipment',
        link: 'equipment',
        active: true
    }
];

const seedBanners = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Banner.deleteMany({});
        await Banner.insertMany(banners);

        console.log('Banners seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding banners:', error);
        process.exit(1);
    }
};

seedBanners();
