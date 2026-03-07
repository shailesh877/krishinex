const mongoose = require('mongoose');

const fieldTaskSchema = new mongoose.Schema({
    executive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    taskId: {
        type: String,
        required: true,
        unique: true
    },
    taskType: {
        type: String,
        enum: ['Cash Collection', 'KYC Verification', 'Visit', 'Other'],
        required: true
    },
    partnerName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    dueDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FieldTask', fieldTaskSchema);
