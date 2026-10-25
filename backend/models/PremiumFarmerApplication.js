const mongoose = require('mongoose');

const premiumFarmerApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  farmerName: {
    type: String,
    required: true
  },
  farmerPhone: {
    type: String,
    required: true
  },
  farmerAddress: {
    type: String,
    default: ''
  },
  
  // IMMUTABLE TERMS SNAPSHOT AT TIME OF PURCHASE (Never overwritten)
  termsVersion: {
    type: Number,
    required: true
  },
  termsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PremiumFarmerTerms',
    default: null
  },
  termsSnapshotEn: {
    type: String,
    required: true
  },
  termsSnapshotHi: {
    type: String,
    required: true
  },
  termsAccepted: {
    type: Boolean,
    default: true
  },
  termsAcceptedAt: {
    type: Date,
    default: Date.now
  },

  // PAYMENT DETAILS
  paymentAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['created', 'completed', 'failed'],
    default: 'created'
  },
  razorpayOrderId: {
    type: String,
    default: ''
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  paidAt: {
    type: Date,
    default: null
  },

  // APPLICATION STATUS
  status: {
    type: String,
    enum: ['payment_pending', 'pending_approval', 'approved', 'rejected'],
    default: 'payment_pending',
    index: true
  },

  // ADMIN REVIEW & LIMIT ALLOCATION
  assignedLimit: {
    type: Number,
    default: 0
  },
  limitType: {
    type: String,
    enum: ['credit_limit', 'transaction_limit', 'agri_input_limit'],
    default: 'credit_limit'
  },
  adminRemarks: {
    type: String,
    default: ''
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
  expiresAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

premiumFarmerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PremiumFarmerApplication', premiumFarmerApplicationSchema);
