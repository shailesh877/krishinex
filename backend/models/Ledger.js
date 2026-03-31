const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopOrder'
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['PAYMENT', 'DUE'], // PAYMENT is when money is paid (Cash/Wallet), DUE is Udhaar
        required: true
    },
    method: {
        type: String,
        enum: ['CASH', 'WALLET', 'DUE', 'RECOVERY', 'SHOP_DUE'], // RECOVERY is when a DUE or SHOP_DUE is paid
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster lookups
ledgerSchema.index({ shopId: 1, farmerId: 1 });
ledgerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
