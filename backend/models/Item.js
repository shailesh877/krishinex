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
        enum: ['seed', 'pesticide', 'equipment', 'fertilizer', 'other'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        enum: ['BAG', 'QUINTAL', 'KG', 'BOTTLE', 'PIECE'],
        required: true
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Item', itemSchema);
