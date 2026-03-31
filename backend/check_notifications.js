const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const Notification = mongoose.model('Notification', new mongoose.Schema({
        type: String,
        title: String,
        createdAt: { type: Date, default: Date.now }
    }));
    
    const count = await Notification.countDocuments({ type: 'PAYMENT_REMINDER' });
    console.log(`Payment reminders found: ${count}`);
    
    if (count > 0) {
        const last = await Notification.findOne({ type: 'PAYMENT_REMINDER' }).sort({ createdAt: -1 });
        console.log('Last reminder:', last);
    }
    process.exit(0);
}
check();
