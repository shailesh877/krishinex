const mongoose = require('mongoose');

const milkDailyLogSchema = new mongoose.Schema({
  subscriptionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MilkSubscription', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: ['sell', 'buy'], 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    index: true 
  },
  shift: { 
    type: String, 
    enum: ['Morning', 'Evening'], 
    default: 'Morning' 
  },
  quantityLiters: { 
    type: Number, 
    required: true 
  },
  ratePerLiter: { 
    type: Number, 
    required: true 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Completed', 'Skipped', 'Paused'], 
    default: 'Completed' 
  },
  fatPercentage: {
    type: Number,
    default: null
  },
  snfPercentage: {
    type: Number,
    default: null
  },
  performedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  adminCommissionPercent: {
    type: Number,
    default: 10
  },
  adminCutAmount: {
    type: Number,
    default: 0
  },
  partnerEarning: {
    type: Number,
    default: 0
  },
  // For buyers: link to instant wallet debit transaction
  debitTransactionId: { 
    type: String, 
    default: '' 
  },
  // For sellers: 7-day rollout tracking
  isProcessedInWithdrawal: { 
    type: Boolean, 
    default: false 
  },
  withdrawalTransactionId: { 
    type: String, 
    default: '' 
  },
  notes: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

milkDailyLogSchema.index({ userId: 1, date: -1 });
milkDailyLogSchema.index({ subscriptionId: 1, date: -1, shift: 1 });
milkDailyLogSchema.index({ type: 1, date: -1, shift: 1 });

module.exports = mongoose.model('MilkDailyLog', milkDailyLogSchema);
