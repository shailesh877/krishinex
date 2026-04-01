const mongoose = require('mongoose');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const Ledger = require('./models/Ledger');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const shopId = '69b50bfcb1e821860e3b9737'; // Akash
        const logs = await Ledger.find({ shopId });
        
        console.log('--- ALL ENTRIES FOR AKASH ---');
        logs.forEach(l => {
            console.log(`[${l._id}] ${l.method} | ₹${l.amount} | ${l.note} | ${l.type}`);
        });
        
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
check();
