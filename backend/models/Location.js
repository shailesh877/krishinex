const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    state: {
        type: String,
        required: true,
        unique: true
    },
    districts: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Location', locationSchema);
