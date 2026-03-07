const mongoose = require('mongoose');

const mandiPriceSchema = new mongoose.Schema({
    mandi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mandi',
        required: true
    },
    cropName: {
        type: String, // 'Wheat', 'Rice' etc.
        required: true
    },
    price: {
        type: Number, // In Rs per Quintal
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying of last 7 days prices
mandiPriceSchema.index({ mandi: 1, cropName: 1, date: -1 });

module.exports = mongoose.model('MandiPrice', mandiPriceSchema);
