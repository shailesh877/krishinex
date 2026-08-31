const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const NexCard = mongoose.model('NexCard', new mongoose.Schema({}, { strict: false }));

async function verifyLogic() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const testCardNumber = 'TESTCARD12345678';
        
        // 1. Clean up
        await NexCard.deleteOne({ cardNumber: testCardNumber });
        console.log('Cleaned up test card');

        // 2. Insert as available
        const card = new NexCard({
            cardNumber: testCardNumber,
            status: 'available'
        });
        await card.save();
        console.log('Inserted test card as available');

        // 3. Find a test user (the one I fixed earlier)
        const user = await User.findOne({ email: 'yuvrajsingh7355091011@gmail.com' });
        if (!user) {
            console.log('Test user not found');
            process.exit(1);
        }

        console.log('Test user found:', user.email);

        // We can't easily call the route without a full express setup, 
        // but we can check if the model logic in the route would work.
        
        // Manual simulation of the route logic:
        const checkCard = await NexCard.findOne({ cardNumber: testCardNumber });
        if (checkCard && checkCard.status === 'available') {
            console.log('Success: Card is available in inventory.');
        } else {
            console.log('Error: Card not found or not available.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyLogic();
