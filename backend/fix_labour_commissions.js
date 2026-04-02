require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const LabourJob = require('./models/LabourJob');
const Settings = require('./models/Settings');

async function fixCommissions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.getSettings();
        const rate = settings.commissions.labour || 5;
        console.log(`Using Labour Commission Rate: ${rate}%`);

        const jobs = await LabourJob.find({
            $or: [
                { platformCommission: { $exists: false } },
                { platformCommission: 0 },
                { ownerPayout: { $exists: false } },
                { ownerPayout: 0 }
            ],
            amount: { $gt: 0 }
        });

        console.log(`Found ${jobs.length} jobs to update`);

        let updated = 0;
        for (const job of jobs) {
            const amount = job.amount || 0;
            const commission = Math.round(amount * (rate / 100));
            const payout = amount - commission;

            job.platformCommission = commission;
            job.ownerPayout = payout;
            await job.save();
            updated++;
        }

        console.log(`Successfully updated ${updated} jobs`);
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

fixCommissions();
