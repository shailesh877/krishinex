const mongoose = require('mongoose');
const User = require('../models/User');

async function test() {
    try {
        const uri = 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';
        await mongoose.connect(uri);
        const allowedStatuses = ['approved', 'active', 'verified'];
        const executives = await User.find({ 
            role: 'field_executive', 
            status: { $in: allowedStatuses } 
        }).select('name phone businessName status');
        console.log('--- FOUND EXECUTIVES ---');
        console.log(JSON.stringify(executives, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
