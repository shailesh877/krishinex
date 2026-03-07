const mongoose = require('mongoose');

const RentalSchema = new mongoose.Schema({
    machine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },

    // --- Booking financials ---
    totalAmount: {
        type: Number,
        default: 0         // total rental charge (days * priceDay)
    },
    platformCommission: {
        type: Number,
        default: 0         // platform cut (e.g. 5%)
    },
    ownerPayout: {
        type: Number,
        default: 0         // totalAmount - platformCommission
    },

    // --- Status ---
    status: {
        type: String,
        enum: ['New', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
        default: 'New'
    },
    cancelReason: {
        type: String,
    },

    // --- Field Executive assignment & cash collection ---
    assignedFieldExec: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    cashCollected: {
        type: Boolean,
        default: false
    },
    cashCollectedAt: {
        type: Date,
        default: null
    },
    cashCollectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    cashNote: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Rental', RentalSchema);
