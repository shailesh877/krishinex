const mongoose = require('mongoose');

const adEnquirySchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  company: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  category: { type: String, required: true },
  message: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'in-progress', 'resolved'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdEnquiry', adEnquirySchema);
