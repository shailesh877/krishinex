const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function checkShops() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const shops = await User.find({ role: { $in: ['shop', 'ksp'] } }).select('name phone role walletBalance');
        console.log(`Found ${shops.length} shop/ksp partners`);
        
        shops.forEach(s => {
            console.log(`Name: ${s.name}, Phone: ${s.phone}, Role: ${s.role}, Wallet: ${s.walletBalance}, ID: ${s._id}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkShops();
