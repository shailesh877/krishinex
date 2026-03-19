const mongoose = require('mongoose');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function fixTransactions() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');
        
        const Transaction = require('./models/Transaction');
        const LabourJob = require('./models/LabourJob');
        require('./models/User'); // Required for populate

        // Find recent LAB-CR transactions
        const crTxs = await Transaction.find({ transactionId: { $regex: /^LAB-CR/ } }).sort({ createdAt: -1 }).limit(5);
        
        for (let cr of crTxs) {
            const jobId = cr.referenceId;
            if (!jobId) continue;
            
            // Do we already have a DR for this job?
            const existingDr = await Transaction.findOne({ transactionId: { $regex: /^LAB-DR/ }, referenceId: jobId });
            if (existingDr) {
                console.log(`Job ${jobId} already has a DR transaction.`);
                continue;
            }
            
            // Need the farmer ID
            const job = await LabourJob.findById(jobId).populate('labour');
            if (!job) continue;
            
            const drTx = new Transaction({
                transactionId: `LAB-DR-${job._id}-${Date.now()}`,
                recipient: job.farmer,
                module: 'Labour',
                amount: cr.amount,
                type: 'Debit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: job._id,
                description: `Payment for labour job by ${job.labour ? job.labour.name : 'Unknown'}`
            });
            
            await drTx.save();
            console.log(`Created missing DR transaction for Farmer ${job.farmer} for job ${job._id} (Amount: ${cr.amount})`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixTransactions();
