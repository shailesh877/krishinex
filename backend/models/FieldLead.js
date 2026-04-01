const mongoose = require('mongoose');

const fieldLeadSchema = new mongoose.Schema({
    executive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        enum: ['Kisan', 'Dukan'],
        required: true
    },
    // Common Fields
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    photoUrl: { type: String },

    // Kisan specific
    farmerDetails: {
        name: { type: String },
        village: { type: String },
        landSize: { type: String },
        currentCrop: { type: String },
        needsNexCard: { type: String, enum: ['Yes', 'No', ''] }
    },

    // Dukan specific
    shopDetails: {
        shopName: { type: String },
        ownerName: { type: String },
        shopCategory: { type: String }, // Seeds, Pesticides, etc.
        partnerInterest: { type: String, enum: ['High', 'Low', ''] }
    },

    status: {
        type: String,
        enum: ['Pending', 'Contacted', 'Closed'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FieldLead', fieldLeadSchema);
