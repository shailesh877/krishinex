const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function clearDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Clear card for NIROJ Kumar (the one without email in my previous script)
        const niroj = await User.findOne({ name: /NIROJ Kumar/ });
        if (niroj) {
            niroj.cardNumber = '';
            await niroj.save();
            console.log('Cleared card for NIROJ Kumar');
        }

        // Clear for one of the Kishans
        const kishan = await User.findOne({ email: 'sxbhasb@gmail.com' });
        if (kishan) {
            kishan.cardNumber = '';
            await kishan.save();
            console.log('Cleared card for kishan sxbhasb@gmail.com');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearDuplicates();
