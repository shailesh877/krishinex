const mongoose = require('mongoose');

// A single Chat room between a farmer and the doctor-employee
const chatSchema = new mongoose.Schema({
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cropName: {
        type: String,
        default: ''
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastTime: {
        type: Date,
        default: Date.now
    },
    unreadByDoctor: {
        type: Number,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    mediaUrl: {
        type: String,
        default: ''
    },
    mediaType: {
        type: String,
        enum: ['image', 'audio', ''],
        default: ''
    },
    audioDuration: {
        type: Number,
        default: 0
    },
    fromDoctor: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { Chat, Message };
