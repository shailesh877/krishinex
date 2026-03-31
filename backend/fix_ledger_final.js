const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Find all ledger entries with old Agri-Credit note and set type to PAYMENT
        const result = await mongoose.connection.collection('ledgers').updateMany(
            { 
                method: 'DUE', 
                note: 'POS Udhaar (Due)' 
            },
            { $set: { type: 'PAYMENT' } }
        );
        
        console.log(`Successfully fixed ${result.modifiedCount} entries.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
