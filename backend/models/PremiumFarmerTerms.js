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
  strikeThroughFee: {
    type: Number,
    default: 1999
  },
  validityDays: {
    type: Number,
    default: 365
  },
  bannerBadgeText: {
    type: String,
    default: 'VIP FARMER MEMBERSHIP'
  },
  bannerTitleHi: {
    type: String,
    default: 'कृषि-नेक्स प्रीमियम किसान बनें'
  },
  bannerTitleEn: {
    type: String,
    default: 'Join as KrishiNex Premium Farmer'
  },
  bannerSubHi: {
    type: String,
    default: 'विशेष क्रेडिट सीमा, शून्य-कमीशन बाज़ार पहुंच, और 24×7 विशेषज्ञ कृषि डॉक्टर सेवा'
  },
  bannerSubEn: {
    type: String,
    default: 'Unlock customized agricultural credit limit, priority doctor access, and dedicated inputs.'
  },
  benefits: [
    {
      titleHi: { type: String, required: true },
      titleEn: { type: String, required: true },
      subHi: { type: String, required: true },
      subEn: { type: String, required: true },
      icon: { type: String, default: 'card' }, // ionicons name
      bgColor: { type: String, default: '#FEF3C7' },
      iconColor: { type: String, default: '#D97706' },
      enabled: { type: Boolean, default: true }
    }
  ],
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
