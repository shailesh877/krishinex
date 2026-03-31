const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function checkKYC() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const labs = await User.find({ role: 'soil_lab' }).limit(5);
        labs.forEach(l => {
            console.log(`Lab: ${l.name} | Doc: ${l.aadhaarDocUrl}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkKYC();
