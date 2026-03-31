const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const count = await db.collection('notifications').countDocuments({ type: 'PAYMENT_REMINDER' });
        console.log(`Payment reminders found: ${count}`);
        
        if (count > 0) {
            const last = await db.collection('notifications').find({ type: 'PAYMENT_REMINDER' }).sort({ createdAt: -1 }).limit(1).toArray();
            console.log('Last reminder:', JSON.stringify(last, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
