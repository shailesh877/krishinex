const mongoose = require('mongoose');
const User = require('./models/User');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

async function fixKspIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const kspPartners = await User.find({ role: 'ksp' });
        console.log(`Found ${kspPartners.length} KSP partners`);

        for (const user of kspPartners) {
            if (!user.kspPartnerId || user.kspPartnerId.trim() === "") {
                const prefix = (user.kspType === 'KSP Prime') ? 'KSPP' : 'KSPD';
                let newId;
                let isUnique = false;
                while (!isUnique) {
                    const digits = Math.floor(100000 + Math.random() * 900000);
                    newId = `${prefix}${digits}`;
                    const existing = await User.findOne({ kspPartnerId: newId });
                    if (!existing) isUnique = true;
                }
                user.kspPartnerId = newId;
                await user.save();
                console.log(`Updated user ${user.name} (${user.phone}) with new ID: ${newId}`);
            } else {
                console.log(`User ${user.name} already has ID: ${user.kspPartnerId}`);
            }
        }

        console.log('Finished fixing KSP IDs');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixKspIds();
