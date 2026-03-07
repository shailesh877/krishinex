const mongoose = require('mongoose');

const labourJobSchema = new mongoose.Schema({
    labour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    workType: {
        type: String,
        required: true
    },
    hoursWorked: {
        type: Number,
        default: 0
    },
    acresCovered: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    review: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('LabourJob', labourJobSchema);
