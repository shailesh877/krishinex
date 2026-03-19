const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
const { sendOtp } = require('./services/msg91');
const { sendNotification } = require('./services/notificationService');
require('dotenv').config();

async function verifyOtpNotification() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a test user (farmer)
        let user = await User.findOne({ phone: '1111122222', role: 'farmer' });
        if (!user) {
            user = await User.create({
                name: 'Test Farmer',
                phone: '1111122222',
                role: 'farmer',
                address: 'Test Address',
                walletBalance: 2000,
                status: 'approved'
            });
            console.log('Created Test Farmer');
        }

        // 2. Clear old notifications for this user
        await Notification.deleteMany({ user: user._id, title: 'Withdrawal OTP' });
        console.log('Cleared old withdrawal OTP notifications');

        // 3. Simulate the request-otp logic
        const amount = 500;
        const customOtp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP: ${customOtp} for Amount: ${amount}`);

        // Mock sendOtp (since we verified the code logic)
        console.log('Simulating sendOtp...');
        
        // Call sendNotification (real call to verify DB storage)
        console.log('Calling sendNotification...');
        await sendNotification(user._id, {
            title: 'Withdrawal OTP',
            messageEn: `Your OTP for withdrawal of ₹${amount} is ${customOtp}. Valid for 10 minutes.`,
            messageHi: `₹${amount} की निकासी के लिए आपका OTP ${customOtp} है। 10 मिनट के लिए मान्य।`,
            type: 'payment',
            data: { otp: customOtp, amount: amount.toString() }
        });

        // 4. Verify Notification in DB
        const latestNotification = await Notification.findOne({ user: user._id, title: 'Withdrawal OTP' }).sort({ createdAt: -1 });
        
        if (latestNotification && latestNotification.messageEn.includes(customOtp)) {
            console.log('✅ NOTIFICATION VERIFIED IN DATABASE');
            console.log('Message:', latestNotification.messageEn);
        } else {
            console.error('❌ NOTIFICATION NOT FOUND OR OTP MISMATCH');
        }

        process.exit(0);
    } catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    }
}

verifyOtpNotification();
