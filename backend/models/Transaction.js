const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    module: {
        type: String,
        enum: ['Equipment', 'Labour', 'BuyerTrading', 'Platform', 'KSP', 'Shop', 'Soil'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['Payout', 'Collection', 'Debit', 'Credit'],
        default: 'Payout'
    },
    paymentMode: {
        type: String,
        enum: ['Bank Transfer', 'NexCard Wallet', 'UPI', 'Cash', 'Pending'],
        default: 'Pending'
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    // Reference to the source document this pays out (Rental, LabourJob, Order)
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    // Who performed the transaction (Field Executive / Employee)
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    // For cash recharges: has the FE/Employee given the cash to Admin?
    cashCollectedByAdmin: {
        type: Boolean,
        default: false
    },
    // Optional remark from admin
    note: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
