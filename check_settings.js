const mongoose = require('mongoose');
const fs = require('fs');

const envPath = 'd:/khetify/backend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
    }
});

const mongoUri = process.env.MONGODB_URI;
const Settings = require('d:/khetify/backend/models/Settings');

async function check() {
    try {
        await mongoose.connect(mongoUri);
        const count = await Settings.countDocuments();
        console.log('Total Settings Documents:', count);
        
        const allSettings = await Settings.find();
        allSettings.forEach((s, idx) => {
            console.log(`Settings #${idx}: ID=${s._id}, Commissions=${JSON.stringify(s.commissions)}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
