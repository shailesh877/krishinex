const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'resolved', 'in-progress'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContactRequest', contactSchema);
