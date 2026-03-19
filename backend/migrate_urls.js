const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Item = require('./models/Item');
const Machine = require('./models/Machine');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const cleanUrl = (url) => {
            if (!url || typeof url !== 'string') return url;
            if (url.startsWith('http')) {
                const match = url.match(/\/uploads\/(.+)$/);
                if (match) {
                    return `uploads/${match[1]}`;
                }
            }
            if (url.startsWith('/uploads/')) {
                return url.substring(1); // remove leading slash
            }
            return url;
        };

        // 1. Migrate Users
        const users = await User.find({});
        for (const user of users) {
             let changed = false;
             const fields = ['profilePhotoUrl', 'aadhaarDocUrl', 'panDocUrl', 'businessLicenseUrl'];
             fields.forEach(field => {
                 const oldVal = user[field];
                 const newVal = cleanUrl(oldVal);
                 if (oldVal !== newVal) {
                     user[field] = newVal;
                     changed = true;
                 }
             });
             if (changed) {
                 await user.save();
                 console.log(`Updated User: ${user.name}`);
             }
        }

        // 2. Migrate Items
        const items = await Item.find({});
        for (const item of items) {
            const oldVal = item.imageUrl;
            const newVal = cleanUrl(oldVal);
            if (oldVal !== newVal) {
                item.imageUrl = newVal;
                await item.save();
                console.log(`Updated Item: ${item.name}`);
            }
        }

        // 3. Migrate Machines
        const machines = await Machine.find({});
        for (const machine of machines) {
            if (machine.images && Array.isArray(machine.images)) {
                let changed = false;
                const newImages = machine.images.map(img => {
                    const clean = cleanUrl(img);
                    if (clean !== img) changed = true;
                    return clean;
                });
                if (changed) {
                    machine.images = newImages;
                    await machine.save();
                    console.log(`Updated Machine: ${machine.name}`);
                }
            }
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
