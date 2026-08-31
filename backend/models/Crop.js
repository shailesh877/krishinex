const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    hindiName: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: '🌾'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Crop', cropSchema);
