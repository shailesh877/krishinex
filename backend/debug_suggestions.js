const mongoose = require('mongoose');
require('dns').setServers(['8.8.8.8', '1.1.1.1']); // DNS fix
const Suggestion = require('./models/Suggestion');
require('dotenv').config();

async function check() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');
        const count = await Suggestion.countDocuments();
        const suggestions = await Suggestion.find().sort({ createdAt: -1 }).limit(5);
        console.log(`Total Suggestions: ${count}`);
        console.log('Last 5 Suggestions:', JSON.stringify(suggestions, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

check();
