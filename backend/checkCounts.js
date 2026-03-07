const mongoose = require('mongoose');
require('dotenv').config();
const Machine = require('./models/Machine');

const checkCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const total = await Machine.countDocuments({});
        const tractors = await Machine.countDocuments({ category: 'tractor' });
        const harvesters = await Machine.countDocuments({ category: 'harvester' });
        const pumps = await Machine.countDocuments({ category: 'pump' });
        const all = await Machine.find({});

        console.log('Total machines:', total);
        console.log('Tractors:', tractors);
        console.log('Harvesters:', harvesters);
        console.log('Pumps:', pumps);
        console.log('All machines data (first 5 categories):', all.slice(0, 5).map(m => ({ name: m.name, cat: m.category })));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkCounts();
