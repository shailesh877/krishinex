const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Define Minimal Schema
const ledgerSchema = new mongoose.Schema({
    method: String,
    type: String,
    note: String
});
const Ledger = mongoose.model('Ledger', ledgerSchema, 'ledgers');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Change Agri-Credit DUE to PAYMENT because Admin pays the Shop
        const res = await Ledger.updateMany(
            { 
                method: 'DUE', 
                type: 'DUE'
            },
            { $set: { type: 'PAYMENT', note: 'POS Agri-Credit (Paid by Admin)' } }
        );
        
        console.log(`Updated ${res.modifiedCount} platform credit entries to PAYMENT.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
