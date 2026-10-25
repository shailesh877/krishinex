const mongoose = require('mongoose');

const premiumFarmerTermsSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
    unique: true
  },
  titleEn: {
    type: String,
    default: 'KrishiNex Premium Farmer Membership Agreement'
  },
  titleHi: {
    type: String,
    default: 'कृषि-नेक्स प्रीमियम किसान सदस्यता नियम एवं शर्तें'
  },
  contentEn: {
    type: String,
    required: true
  },
  contentHi: {
    type: String,
    required: true
  },
  membershipFee: {
    type: Number,
    default: 999,
    min: 0
  },
  validityDays: {
    type: Number,
    default: 365
  },
  approvalTatHours: {
    type: Number,
    default: 24
  },
  minimumCreditLimit: {
    type: Number,
    default: 10000,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('PremiumFarmerTerms', premiumFarmerTermsSchema);
