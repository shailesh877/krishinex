const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/khetify/backend/.env' });
const User = require('d:/khetify/backend/models/User');

async function run() {
    try {
        // Falling back to a hardcoded non-SRV string if SRV fails (using the known cluster info)
        const uri = "mongodb://pasiwaresocial_db_user:Ys%409455238860@ac-x0wee2n-shard-00-00.x0wee2n.mongodb.net:27017,ac-x0wee2n-shard-00-01.x0wee2n.mongodb.net:27017,ac-x0wee2n-shard-00-02.x0wee2n.mongodb.net:27017/khetify?ssl=true&replicaSet=atlas-x0wee2n-shard-0&authSource=admin&retryWrites=true&w=majority";
        await mongoose.connect(uri);
        const roles = await User.distinct('role');
        console.log('Roles in DB:', roles);
        
        const allUsers = await User.find({}).select('name role cardNumber');
        console.log('Total Users:', allUsers.length);
        
        const rolesWithCards = {};
        allUsers.forEach(u => {
            if (u.cardNumber) {
                rolesWithCards[u.role] = (rolesWithCards[u.role] || 0) + 1;
            }
        });
        
        console.log('Roles with Card Numbers:', rolesWithCards);
        
        const sampleOthers = allUsers.filter(u => !u.cardNumber).slice(0, 5);
        console.log('Sample users WITHOUT cards:', sampleOthers.map(u => ({ name: u.name, role: u.role })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
