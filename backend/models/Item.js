const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['seed', 'fert', 'pest', 'tool', 'pesticide', 'equipment', 'fertilizer', 'other'],
        required: true
    },
    price: {
        type: Number,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    stockQty: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String
    },
    hsnCode: {
        type: String,
        trim: true
    },
    cgstPercent: {
        type: Number,
        default: 0
    },
    sgstPercent: {
        type: Number,
        default: 0
    },
    hasVariants: {
        type: Boolean,
        default: false
    },
    variants: [{
        label: { type: String, trim: true },
        price: { type: Number, min: 0 },
        stockQty: { type: Number, default: 0, min: 0 }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Item', itemSchema);
