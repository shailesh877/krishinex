const mongoose = require('mongoose');
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function checkMachines() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');
        
        const Machine = require('./models/Machine');
        const machines = await Machine.find({}).sort({ createdAt: -1 }).limit(10);
        
        console.log('\n--- DATA REPORT ---');
        machines.forEach(m => {
            console.log(`\nMACHINE: ${m.name} [ID: ${m._id}]`);
            console.log(`Images Count: ${m.images?.length || 0}`);
            console.log(`Sub-Machinery Count: ${m.subMachinery?.length || 0}`);
            if (m.subMachinery && m.subMachinery.length > 0) {
                m.subMachinery.forEach((sm, i) => {
                    console.log(`   [${i}] ${sm.name} | Image: ${sm.image}`);
                });
            }
        });
        
        process.exit(0);
    } catch (err) {
        console.error('DB ERROR:', err);
        process.exit(1);
    }
}

checkMachines();
