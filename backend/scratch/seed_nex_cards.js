const mongoose = require('mongoose');
require('dotenv').config();

// DNS Fix
try { require('dns').setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

const NexCardSchema = new mongoose.Schema({
    cardNumber: String,
    status: { type: String, default: 'available' },
    createdAt: { type: Date, default: Date.now }
});

const NexCard = mongoose.model('NexCard', NexCardSchema);

async function seedCards() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const cards = [];
        for (let i = 1; i <= 20; i++) {
            const num = 'NEX' + Math.floor(1000000000000 + Math.random() * 9000000000000);
            cards.push({ cardNumber: num.substring(0, 16), status: 'available' });
        }

        await NexCard.insertMany(cards);
        console.log('Successfully added 20 available cards to inventory');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding cards:', err);
        process.exit(1);
    }
}

seedCards();
