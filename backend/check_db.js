const mongoose = require('mongoose');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function checkJobs() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');
        
        const LabourJob = require('./models/LabourJob');
        const jobs = await LabourJob.find().sort({ createdAt: -1 }).limit(5).populate('labour', 'name');
        
        console.log('Last 5 jobs:');
        jobs.forEach(j => {
            console.log(`Job ID: ${j._id} | Labour: ${j.labour?.name} | Status: ${j.status} | OTP: ${j.completionOTP}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkJobs();
