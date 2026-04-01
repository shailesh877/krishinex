const mongoose = require('mongoose');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const Ledger = require('./models/Ledger');

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const shopId = '69b50bfcb1e821860e3b9737'; // Akash
        
        // Delete personal bahi-khata entries (Udhaar and Recovery)
        const r = await Ledger.deleteMany({ 
            shopId, 
            method: { $in: ['SHOP_DUE', 'RECOVERY', 'PLATFORM_RECOVERY'] } 
        });
        
        console.log(`[RESET] Deleted entries: ${r.deletedCount}`);
        console.log(`[RESET] Akash's "Bahi-Khata" is now 0. Starting fresh.`);
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
reset();
