const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Ledger = require('./models/Ledger');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Fix entries where Agri-Credit (Due) was incorrectly marked as shop debt (DUE)
        const res = await Ledger.updateMany(
            { 
                method: 'DUE', 
                type: 'DUE',
                note: 'POS Udhaar (Due)' // The old note
            },
            { $set: { type: 'PAYMENT' } }
        );
        
        console.log(`Updated ${res.modifiedCount} platform credit entries to PAYMENT type.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
