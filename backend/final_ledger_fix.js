const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Define Model Inline
        const Ledger = mongoose.model('Ledger', new mongoose.Schema({
            method: String,
            type: String,
            note: String
        }));

        // Change Agri-Credit DUE to PAYMENT because Admin pays the Shop
        const result = await Ledger.updateMany(
            { 
                method: 'DUE', 
                type: 'DUE',
                note: /POS/ 
            },
            { $set: { type: 'PAYMENT' } }
        );
        
        console.log(`Successfully fixed ${result.modifiedCount} entries.`);
        process.exit(0);
    } catch (e) {
        console.error('Error during fix:', e);
        process.exit(1);
    }
}

fix();
