const mongoose = require('mongoose');
const User = require('./models/User');
const { sendNotification } = require('./services/notificationService');
const { sendOtp } = require('./services/msg91');
require('dotenv').config();

// DNS Fix for MongoDB SRV
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find a test farmer (first one)
        const farmer = await User.findOne({ role: 'farmer' });
        if (!farmer) {
            console.error('No farmer found in DB to test');
            process.exit(1);
        }

        console.log(`Testing notification for Farmer: ${farmer.name} (${farmer.phone})`);
        const otp = "1234";
        const msgEn = `DIAGNOSTIC TEST: Your OTP is ${otp}.`;
        
        console.log('Attempting Push Notification...');
        await sendNotification(farmer._id, {
            title: 'Diagnostic Test',
            messageEn: msgEn,
            messageHi: msgEn,
            type: 'test'
        });

        if (farmer.phone) {
            const cleanPhone = farmer.phone.replace(/[^0-9]/g, '');
            console.log(`Attempting SMS to ${cleanPhone}...`);
            await sendOtp(cleanPhone, otp).then(() => {
                console.log('SMS sent successfully according to MSG91');
            }).catch(e => {
                console.error('SMS Failed:', e.message);
            });
        }

        console.log('Test logic completed.');
        process.exit(0);
    } catch (e) {
        console.error('FATAL TEST ERROR:', e);
        process.exit(1);
    }
}

runTest();
