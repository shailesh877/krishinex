const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'equipment', 'soil', 'shop', 'ksp', 'labour', 'employee', 'admin', 'field_executive'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  businessName: {
    type: String, // Optional, for shop, soil lab, equipment, labour group
  },
  email: {
    type: String, // Optional
    sparse: true, // Allows null/undefined to not violate unique constraint
  },
  password: {
    type: String, // Required for Employee logins, absent for OTP users
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  aadhaarNumber: {
    type: String, // Optional for employee maybe, but required for partners
  },
  aadhaarDocUrl: {
    type: String,
  },
  // For Field Executives
  assignedArea: {
    type: String,
    trim: true
  },
  profilePhotoUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'blocked'],
    default: 'pending' // Admin needs to approve partners
  },
  mandi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mandi'
  },
  // Employee specific fields
  employeeModules: {
    type: [String],
    default: ['labour', 'equipment', 'soil', 'doctor'] // By default full access for backward compatibility, admin can restrict
  },
  employeeCode: {
    type: String,
    unique: true,
    sparse: true
  },
  // Soil Lab specific fields
  soilDetails: {
    testTypes: [{
      type: String,
      enum: ['NPK', 'pH', 'Micro Nutrients', 'Organic Carbon', 'Other']
    }],
    tatDays: {
      type: Number,
      default: 3
    }
  },
  // Labour specific fields
  labourDetails: {
    skills: [{ type: String }],
    availability: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    jobsCompleted: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    }
  },
  maxDistanceKm: {
    type: Number,
    default: 15
  },
  ratePerDay: {
    type: Number,
    default: 700
  },
  ratePerHour: {
    type: Number,
    default: 90
  },
  jobNotificationOn: {
    type: Boolean,
    default: true
  },
  whatsappOn: {
    type: Boolean,
    default: true
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  walletNumber: {
    type: String,
    default: ''
  },
  cardNumber: {
    type: String,
    default: ''
  },
  walletRechargeAmount: {
    type: Number,
    default: 0
  },
  walletRechargeStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NONE'
  },
  // KYC & Compliance Fields
  panNumber: { type: String, default: '' },
  panDocUrl: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  businessLicenseUrl: { type: String, default: '' },
  kycVerifiedAt: { type: Date },
  kycVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kycRemarks: { type: String, default: '' },
  // Bank Details (for payouts/billing)
  bankDetails: {
    holderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankAddress: { type: String, default: '' },
    bankDocUrl: { type: String, default: '' }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [83.00, 25.33] } // [lng, lat]
  },
  fcmToken: {
    type: String,
    default: ''
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  creditUsed: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ phone: 1, role: 1 }, { unique: true });
userSchema.index({ email: 1, role: 1 }, { unique: true, sparse: true });
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
