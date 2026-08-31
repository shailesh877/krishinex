const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 1. Personal Details
    farmerName: { type: String, required: true },
    fatherName: { type: String },
    mobile: { type: String, required: true },
    aadhaar: { type: String, required: true },
    fullAddress: { type: String, required: true },
    pan: { type: String },

    // 2. Land & Farming
    landSize: { type: String, required: true },
    landType: { type: String, enum: ['irrigated', 'unirrigated', ''], default: '' },
    khatauni: { type: String },
    crops: { type: String },
    irrigation: { type: String },

    // 3. Loan Requirements
    loanPurpose: { type: String, required: true },
    otherPurpose: { type: String },
    loanAmount: { type: Number, required: true },

    // 4. Financial History
    bankAccount: { type: String },
    bankName: { type: String },
    hasExistingLoan: { type: String, enum: ['yes', 'no', ''], default: '' },
    existingLoanDetails: { type: String },

    // 5. Income Details
    farmingMonthlyIncome: { type: String },
    otherIncome: { type: String },
    familyMonthlyIncome: { type: String },
    annualTurnover: { type: String },

    status: {
        type: String,
        enum: ['pending', 'contacted', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
