const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    priceDay: {
        type: Number,
        default: 0
    },
    priceHour: {
        type: Number,
        default: 0
    },
    desc: {
        type: String,
        default: ''
    },
    distanceKm: {
        type: Number,
        default: 0
    },
    village: {
        type: String,
        default: ''
    },
    category: {
        type: String, // 'tractor', 'harvester', 'pump', etc.
        default: 'other'
    },
    images: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Machine', MachineSchema);
