const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function dump() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const logs = await db.collection('ledgers').find({}).toArray();
        console.log('--- LEDGER DUMP ---');
        logs.forEach(l => {
            console.log(`ID: ${l._id} | Method: ${l.method} | Type: ${l.type} | Amount: ${l.amount} | Note: "${l.note}"`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
dump();
