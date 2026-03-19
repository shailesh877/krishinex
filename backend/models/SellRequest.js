const mongoose = require('mongoose');

const sellRequestSchema = new mongoose.Schema({
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cropName: {
        type: String,
        required: true
    },
    variety: {
        type: String,
        default: ''
    },
    quantity: {
        type: String, // e.g., '40 Quintal'
        required: true
    },
    expectedPrice: {
        type: String, // e.g., '2200 / Quintal'
        required: true
    },
    mandi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mandi',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'cancelled'],
        default: 'pending'
    },
    moisture: {
        type: String,
        default: ''
    },
    bagCount: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    images: [{
        type: String
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    otp: {
        type: String,
        default: null
    },
    adminPrice: {
        type: Number,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SellRequest', sellRequestSchema);
