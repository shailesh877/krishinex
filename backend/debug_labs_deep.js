const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkSoilLabs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const labs = await User.find({
            role: 'employee',
            employeeModules: 'soil',
            status: 'approved'
        }).select('name businessName phone role status').lean();

        console.log('--- SOIL LABS FROM USER APP API CRITERIA ---');
        console.log(JSON.stringify(labs, null, 2));

        const allSoil = await User.find({
            $or: [
                { role: 'soil' },
                { employeeModules: 'soil' }
            ]
        }).select('name businessName role employeeModules status phone').lean();

        console.log('--- ALL USERS WITH SOIL ROLE OR MODULE ---');
        console.log(JSON.stringify(allSoil, null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}
checkSoilLabs();
