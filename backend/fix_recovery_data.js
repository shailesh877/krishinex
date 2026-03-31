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
            type: String
        }));

        // Fix recovery entries: Change type from DUE (bug) to PAYMENT
        const result = await Ledger.updateMany(
            { 
                method: 'RECOVERY', 
                type: 'DUE' 
            },
            { $set: { type: 'PAYMENT' } }
        );
        
        console.log(`Successfully fixed ${result.modifiedCount} recovery entries.`);
        process.exit(0);
    } catch (e) {
        console.error('Error during recovery fix:', e);
        process.exit(1);
    }
}

fix();
