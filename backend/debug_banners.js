const mongoose = require('mongoose');
const Banner = require('./models/Banner');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Banner.countDocuments();
    const banners = await Banner.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Total Banners: ${count}`);
    console.log('Last 5 Banners:', JSON.stringify(banners, null, 2));
    process.exit(0);
}

check();