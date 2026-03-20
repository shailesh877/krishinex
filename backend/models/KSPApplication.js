const mongoose = require('mongoose');

const kspApplicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  shopName: { type: String },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pin: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'in-review', 'approved', 'rejected'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KSPApplication', kspApplicationSchema);
