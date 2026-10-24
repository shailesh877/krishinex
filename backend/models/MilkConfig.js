const mongoose = require('mongoose');

const milkConfigSchema = new mongoose.Schema({
  configKey: {
    type: String,
    default: 'global_milk_config',
    unique: true
  },
  withdrawalCycleDays: {
    type: Number,
    default: 7,
    min: 1
  },
  defaultSellRate: {
    type: Number,
    default: 45
  },
  defaultBuyRate: {
    type: Number,
    default: 60
  },
  cancellationAgreementText: {
    type: String,
    default: 'I agree that cancelling milk service will stop all upcoming deliveries and collections. Any pending wallet settlements will be processed in accordance with KrishiNex Milk Services terms and conditions.'
  },
  morningShiftWindow: {
    type: String,
    default: '06:00 AM - 08:30 AM'
  },
  eveningShiftWindow: {
    type: String,
    default: '05:00 PM - 07:30 PM'
  },
  // Temporary Pause Settings
  minAdvancePauseDays: {
    type: Number,
    default: 1, // e.g., must request at least 1 day in advance
    min: 0
  },
  minAdvancePauseHours: {
    type: Number,
    default: 24, // e.g., must request at least 24 hours before pause start
    min: 0
  },
  maxAutoApprovePauseDays: {
    type: Number,
    default: 7, // pauses <= 7 days are auto-approved; > 7 days need admin approval
    min: 1
  },
  // Milk Partner Wallet & Commission Settings
  minPartnerWalletBalance: {
    type: Number,
    default: 500, // minimum wallet balance required for partner to purchase milk
    min: 0
  },
  partnerDeliveryCommissionPerLiter: {
    type: Number,
    default: 5, // legacy delivery commission per liter
    min: 0
  },
  adminCommissionPercent: {
    type: Number,
    default: 10, // percentage of milk sales deducted as admin/platform commission (e.g. 10%)
    min: 0,
    max: 100
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('MilkConfig', milkConfigSchema);
