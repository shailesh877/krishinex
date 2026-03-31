const mongoose = require('mongoose');

async function fix() {
    try {
        const uri = 'mongodb://localhost:27017/khetify'; // Default or from env
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const result = await db.collection('ledgers').updateMany(
            { 
                method: 'DUE', 
                note: 'POS Udhaar (Due)' 
            },
            { $set: { type: 'PAYMENT' } }
        );
        
        console.log(`Updated ${result.modifiedCount} entries.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
