const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function dump() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db();
        const logs = await db.collection('ledgers').find({}).toArray();
        console.log('--- RAW LEDGER DATA ---');
        logs.forEach(l => {
            console.log(JSON.stringify({
                id: l._id,
                farmerId: l.farmerId,
                method: l.method,
                type: l.type,
                amount: l.amount,
                note: l.note
            }));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
dump();
