require('dotenv').config();
const mongoose = require('mongoose');
const Rental = require('./models/Rental');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const rentals = await Rental.find({ status: 'Accepted', completionOTP: null });
    console.log(`Found ${rentals.length} rentals to patch`);
    for (let r of rentals) {
        r.completionOTP = Math.floor(1000 + Math.random() * 9000).toString();
        await r.save();
        console.log(`Rental ${r._id} -> OTP: ${r.completionOTP}`);
    }
    console.log('Done!');
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
