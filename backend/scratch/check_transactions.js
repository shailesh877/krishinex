const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// DNS Fix for MongoDB SRV on some networks
try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed (skipping):', e.message);
}

const TransactionSchema = new mongoose.Schema({}, { strict: false, collection: 'transactions' });
const Transaction = mongoose.model('Transaction', TransactionSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Find total completed transaction amount
        const agg = await Transaction.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        console.log('Aggregated Completed Transactions:', agg);

        // Find top 10 largest transactions
        const top = await Transaction.find({ status: 'Completed' })
            .sort({ amount: -1 })
            .limit(10)
            .lean();

        console.log('--- TOP 10 COMPLETED TRANSACTIONS ---');
        top.forEach((t, i) => {
            console.log(`${i+1}. ID: ${t.transactionId}, Amount: ${t.amount}, Type: ${t.type}, Module: ${t.module}, Date: ${t.createdAt}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

check();
