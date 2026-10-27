const mongoose = require('mongoose');

const milkSubscriptionSchema = new mongoose.Schema({
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
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    default: '' 
  },
  address: { 
    type: String, 
    required: true 
  },
  landmark: { 
    type: String, 
    default: '' 
  },
  dailyQuantityLiters: { 
    type: Number, 
    required: true, 
    min: 0.1 
  },
  deliverySchedule: { 
    type: String, 
    enum: ['Morning and Evening', 'Morning Only', 'Evening Only'], 
    default: 'Morning Only' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'paused', 'cancelled', 'blocked'], 
    default: 'pending',
    index: true 
  },
  ratePerLiter: { 
    type: Number, 
    default: 0 
  },
  // Temporary Pause Service
  pauseStartDate: { 
    type: Date, 
    default: null 
  },
  expectedResumeDate: { 
    type: Date, 
    default: null 
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
  pauseApprovalStatus: {
    type: String,
    enum: ['none', 'auto_approved', 'pending_approval', 'approved', 'rejected'],
    default: 'none'
  },
  pauseRequestedDays: {
    type: Number,
    default: 0
  },
  pauseRequestedAt: {
    type: Date,
    default: null
  },
  // Service Cancellation
  cancellationReason: { 
    type: String, 
    default: '' 
  },
  cancellationAgreementAccepted: { 
    type: Boolean, 
    default: false 
  },
  cancellationStatus: {
    type: String,
    enum: ['none', 'pending_approval', 'approved', 'rejected'],
    default: 'none',
    index: true
  },
  cancellationRequestedAt: {
    type: Date,
    default: null
  },
  cancellationAdminRemarks: {
    type: String,
    default: ''
  },
  // Shift Change Request
  requestedSchedule: { 
    type: String, 
    enum: ['', 'Morning and Evening', 'Morning Only', 'Evening Only'], 
    default: '' 
  },
  shiftChangeReason: { 
    type: String, 
    default: '' 
  },
  shiftChangeStatus: { 
    type: String, 
    enum: ['none', 'pending_approval', 'approved', 'rejected'], 
    default: 'none',
    index: true 
  },
  shiftChangeRequestedAt: { 
    type: Date, 
    default: null 
  },
  shiftChangeAdminRemarks: { 
    type: String, 
    default: '' 
  },
  // Approvals & Assignment
  approvedAt: { 
    type: Date, 
    default: null 
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  assignedPartnerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  adminRemarks: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

milkSubscriptionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('MilkSubscription', milkSubscriptionSchema);
