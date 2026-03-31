const mongoose = require('mongoose');

const shopOrderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        itemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        price: Number,
        quantity: Number,
        unit: String,
        variantLabel: String,
        imageUrl: String,
        hsnCode: String,
        cgstPercent: Number,
        sgstPercent: Number,
        taxableAmount: Number,
        gstAmount: Number
    }],
    deliveryAddress: {
        name: String,
        phone: String,
        fullAddress: String,
        note: String,
        location: {
            type: { type: String, default: 'Point' },
            coordinates: [Number]
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
        default: 'NEW'
    },
    cancelReason: {
        type: String
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
    discountPercentage: {
        type: Number,
        default: 0
    },
    walletRechargeStatus: {
        type: String,
        enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NONE'
    },
    estimatedDeliveryTime: {
        type: String,
        default: ''
    },
    orderType: {
        type: String,
        enum: ['ONLINE', 'POS'],
        default: 'ONLINE'
    },
    paymentBreakdown: {
        cash: { type: Number, default: 0 },
        wallet: { type: Number, default: 0 },
        due: { type: Number, default: 0 },
        shopDue: { type: Number, default: 0 }
    },
    posOtp: {
        type: String
    },
    posOtpExpires: {
        type: Date
    },
    isPosVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
