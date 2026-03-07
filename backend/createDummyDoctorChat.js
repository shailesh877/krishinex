const mongoose = require('mongoose');
const { Chat, Message } = require('./models/Chat');
const User = require('./models/User');
require('dotenv').config();

async function createDummyDoctorChat() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const employee = await User.findOne({ email: 'test@employee.com' });
        if (!employee) { console.error('Test employee not found!'); process.exit(1); }

        let farmer = await User.findOne({ role: 'buyer' });
        if (!farmer) {
            farmer = new User({ role: 'buyer', name: 'Ramesh Farmer', phone: '9876540000', address: 'Panipat Village, Haryana' });
            await farmer.save();
        }

        // Create or find a Chat room
        let chat = await Chat.findOne({ farmer: farmer._id, doctor: employee._id });
        if (!chat) {
            chat = new Chat({ farmer: farmer._id, doctor: employee._id, cropName: 'Wheat (गेहूं)', lastMessage: 'नमस्ते Doctor साहब', lastTime: new Date() });
            await chat.save();
        }

        // Create sample messages
        const msgs = [
            { chat: chat._id, sender: farmer._id, text: 'Doctor साहब, मेरे गेहूं के पत्तों पर पीला दाग आ रहा है।', fromDoctor: false },
            { chat: chat._id, sender: employee._id, text: 'कौन सी फसल है और कब से हो रहा है यह?', fromDoctor: true },
            { chat: chat._id, sender: farmer._id, text: '10 दिन से हो रहा है, गेहूं 45 दिन पुरानी है।', fromDoctor: false },
        ];
        await Message.insertMany(msgs);

        console.log('✅ Dummy Doctor Chat created!');
        console.log('Farmer:', farmer.name, '|', 'Chat ID:', chat._id);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

createDummyDoctorChat();
