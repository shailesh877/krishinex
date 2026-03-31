const mongoose = require('mongoose');

const labourJobSchema = new mongoose.Schema({
    labour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    workType: {
        type: String,
        required: true
    },
    hoursWorked: {
        type: Number,
        default: 0
    },
    acresCovered: {
        type: Number,
        default: 0
    },
    paymentMode: {
        type: String,
        enum: ['CASH', 'WALLET'],
        default: 'CASH'
    },
    discountApplied: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    review: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    fromDate: {
        type: Date,
        required: false
    },
    toDate: {
        type: Date,
        required: false
    },
    priceType: {
        type: String,
        enum: ['hourly', 'daily'],
        default: 'daily'
    },
    hours: {
        type: Number,
        default: 0
    },
    days: {
        type: Number,
        default: 0
    },
    purpose: {
        type: String,
        default: ''
    },
    completionOTP: {
        type: String,
        default: null
    },
    platformCommission: {
        type: Number,
        default: 0
    },
    ownerPayout: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('LabourJob', labourJobSchema);
