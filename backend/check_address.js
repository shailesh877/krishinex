require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    require('./models/User'); // Register User schema
    const Rental = require('./models/Rental');
    const r = await Rental.findOne().populate('buyer', 'name phone address').sort({ createdAt: -1 });
    if (r) {
        console.log('Buyer name:', r.buyer?.name);
        console.log('Buyer phone:', r.buyer?.phone);
        console.log('Buyer address:', JSON.stringify(r.buyer?.address));
    } else {
        console.log('No rentals found');
    }
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });

