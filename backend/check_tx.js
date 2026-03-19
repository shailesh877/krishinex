const mongoose = require('mongoose');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function checkTx() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');
        
        const Transaction = require('./models/Transaction');
        const txs = await Transaction.find({ transactionId: { $regex: /^LAB-DR/ } }).sort({ createdAt: -1 }).limit(10);
        
        console.log('Last 10 LAB-DR Transactions:');
        txs.forEach(t => {
            console.log(`ID: ${t._id} | TxId: ${t.transactionId} | Recipient: ${t.recipient} | Type: ${t.type} | Amount: ${t.amount}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTx();
