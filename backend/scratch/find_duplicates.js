const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function findDuplicate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ cardNumber: { $exists: true, $ne: '' } });
        
        const cardMap = {};
        users.forEach(u => {
            if (u.cardNumber) {
                if (cardMap[u.cardNumber]) {
                    cardMap[u.cardNumber].push(u.name + ' (' + u.email + ')');
                } else {
                    cardMap[u.cardNumber] = [u.name + ' (' + u.email + ')'];
                }
            }
        });

        console.log('Duplicate Card Numbers found:');
        for (const [card, owners] of Object.entries(cardMap)) {
            if (owners.length > 1) {
                console.log(`Card: ${card} | Owners: ${owners.join(', ')}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findDuplicate();
