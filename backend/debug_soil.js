const mongoose = require('mongoose');
const User = require('./models/User');
const SoilRequest = require('./models/SoilRequest');
require('dotenv').config();

async function checkSoilData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const labs = await User.find({ role: 'soil' }).lean();
        console.log('Labs Found (role: soil):', labs.length);
        if (labs.length > 0) {
            console.log('First Lab:', JSON.stringify(labs[0], null, 2));
        }

        const allUserRoles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
        console.log('All User Roles in DB:', JSON.stringify(allUserRoles, null, 2));

        const soilReqs = await SoilRequest.find({}).populate('lab').lean();
        console.log('Total Soil Requests:', soilReqs.length);
        if (soilReqs.length > 0) {
            console.log('First Soil Request Lab Info:', soilReqs[0].lab ? soilReqs[0].lab._id : 'No Lab Assigned');
            if (soilReqs[0].lab) {
                console.log('Assigned Lab User Role:', soilReqs[0].lab.role);
            }
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSoilData();
