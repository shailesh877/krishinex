const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: './.env' });

const userSchema = new mongoose.Schema({
    phone: String,
    kspPartnerId: String,
    kspType: String
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ phone: '6666666666' });
        if (user) {
            console.log('Current user:', user.phone, 'ID:', user.kspPartnerId);
            if (!user.kspPartnerId || user.kspPartnerId.length < 5) {
                const prefix = user.kspType === 'KSP Prime' ? 'KSPP' : 'KSPD';
                const randomId = Math.floor(100000 + Math.random() * 900000);
                user.kspPartnerId = `${prefix}${randomId}`;
                await user.save();
                console.log('Fixed! New ID:', user.kspPartnerId);
            } else {
                console.log('User already has ID:', user.kspPartnerId);
            }
        } else {
            console.log('User not found!');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

fix();
