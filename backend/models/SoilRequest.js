const mongoose = require('mongoose');

const soilRequestSchema = new mongoose.Schema({
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    state: {
        type: String,
        default: ''
    },
    district: {
        type: String,
        default: ''
    },
    village: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['New', 'Accepted', 'InProgress', 'Completed', 'Cancelled'],
        default: 'New'
    },
    reportUrl: {
        type: String
    },
    advisoryText: {
        type: String
    },
    cropName: {
        type: String,
        default: ''
    },
    sampleType: {
        type: String,
        default: 'Field Soil'
    },
    visitType: {
        type: String,
        default: 'I will visit lab'
    },
    testType: {
        type: String,
        enum: ['NPK', 'pH', 'Micro Nutrients', 'Organic Carbon', 'Other'],
        default: 'NPK'
    },
    price: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'wallet'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    },
    paidAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SoilRequest', soilRequestSchema);
