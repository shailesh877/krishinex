const mongoose = require('mongoose');

const franchiseSaleSchema = new mongoose.Schema({
    franchise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for anonymous OTC sales, but preferred for farmers
    },
    buyerName: {
        type: String, // Manual entry or from User
        trim: true
    },
    buyerPhone: {
        type: String,
        trim: true
    },
    items: [{
        itemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        price: Number,
        quantity: Number,
        unit: String
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'NexCard Wallet'],
        default: 'Cash'
    },
    status: {
        type: String,
        enum: ['Completed', 'Cancelled'],
        default: 'Completed'
    },
    saleId: {
        type: String,
        unique: true
    },
    notes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('FranchiseSale', franchiseSaleSchema);
