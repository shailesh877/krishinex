
const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./models/Transaction');

async function checkModules() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const modules = await Transaction.distinct('module');
        console.log('Distinct modules:', modules);
        
        const types = await Transaction.distinct('type');
        console.log('Distinct types:', types);

        const sample = await Transaction.find().limit(5).lean();
        console.log('Sample transactions:', JSON.stringify(sample, null, 2));

        await mongoose.connection.close();
    } catch (e) { console.error(e); }
}

checkModules();
