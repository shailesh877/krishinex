const mongoose = require('mongoose');

const milkPauseRequestSchema = new mongoose.Schema({
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
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    default: ''
  },
  dailyQuantityLiters: {
    type: Number,
    default: 0
  },
  // Dates
  pauseStartDate: {
    type: Date,
    required: true
  },
  expectedResumeDate: {
    type: Date,
    required: true
  },
  actualResumedDate: {
    type: Date,
    default: null
  },
  pauseDurationDays: {
    type: Number,
    required: true
  },
  pauseReason: {
    type: String,
    default: ''
  },
  pauseShift: {
    type: String,
    enum: ['Both', 'Morning', 'Evening'],
    default: 'Both'
  },
  // Notice Audit
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  advanceNoticeHours: {
    type: Number,
    default: 0
  },
  // Approval
  approvalStatus: {
    type: String,
    enum: ['auto_approved', 'pending_approval', 'approved', 'rejected'],
    default: 'auto_approved',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  // Lifecycle
  lifecycleStatus: {
    type: String,
    enum: ['pending_review', 'active_pause', 'extended', 'resumed', 'rejected'],
    default: 'active_pause',
    index: true
  },
  // Extension Audit Trail
  isExtension: {
    type: Boolean,
    default: false
  },
  originalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MilkPauseRequest',
    default: null
  },
  extensionHistory: [{
    extendedAt: { type: Date, default: Date.now },
    previousResumeDate: Date,
    newResumeDate: Date,
    extendedDays: Number,
    reason: String,
    approvalStatus: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
  }]
}, { timestamps: true });

// Compound index for fast queries and audit ledger retrieval
milkPauseRequestSchema.index({ subscriptionId: 1, requestedAt: -1 });
milkPauseRequestSchema.index({ userId: 1, requestedAt: -1 });

module.exports = mongoose.model('MilkPauseRequest', milkPauseRequestSchema);
