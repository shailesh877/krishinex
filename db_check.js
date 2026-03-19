
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findById('69b930538be41ec37832c23e');
        if (user) {
            console.log('--- USER DATA ---');
            console.log('ID:', user._id);
            console.log('Name:', user.name);
            console.log('Business:', user.businessName);
            console.log('Wallet Number:', user.walletNumber);
            console.log('-----------------');
        } else {
            console.log('User not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

check();
