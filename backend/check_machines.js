const mongoose = require('mongoose');
require('dotenv').config();

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://pasiwaresocial_db_user:Ys%409455238860@cluster0.x0wee2n.mongodb.net/khetify?retryWrites=true&w=majority';

async function checkMachines() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');
        
        const Machine = require('./models/Machine');
        const machines = await Machine.find({}).sort({ createdAt: -1 }).limit(5);
        
        console.log('Last 5 Machines:');
        machines.forEach(m => {
            console.log(`ID: ${m._id} | Name: ${m.name}`);
            console.log(`   Images: ${m.images.join(', ')}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMachines();
