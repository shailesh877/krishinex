const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Admin assigns this order to a buyer
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Farmer details (filled by admin when assigning)
    farmerName: { type: String, default: '' },
    farmerMobile: { type: String, default: '' },
    village: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    // Pricing
    pricePerQuintal: { type: Number, default: 0 },
    pricePerKg: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    // Crop image
    imageUrl: { type: String, default: '' },
    // Core fields
    crop: { type: String, required: true },
    mandi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mandi'
    },
    payment: {
        type: String,
        enum: ['COD', 'PAID'],
        default: 'COD'
    },
    quantity: { type: String, required: true },
    variety: { type: String, default: '' },
    location: { type: String, required: true },
    note: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    // Buyer's action on an assigned order
    assignedStatus: {
        type: String,
        enum: ['new', 'ok', 'delivered', 'cancelled'],
        default: 'new'
    },
    cancelReason: { type: String, default: '' },
    // Payment reconciliation fields
    amountReceived: { type: Number, default: 0 },
    farmerAmount: { type: Number, default: 0 },
    settlement: {
        type: String,
        enum: ['pending', 'in-progress', 'settled'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
