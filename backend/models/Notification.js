const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    messageHi: { type: String, default: '' },
    messageEn: { type: String, required: true },
    type: {
        type: String,
        enum: ['order', 'assigned', 'status', 'system', 'payment', 'PAYMENT_REMINDER', 'crop_sale', 'low_stock'],
        default: 'system'
    },
    refId: { type: String, default: '' }, // order ID or other ref
    unread: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
