const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Commission rates in percentage
    commissions: {
        equipment: { type: Number, default: 5 },
        labour: { type: Number, default: 5 },
        buyerTrading: { type: Number, default: 2 },
        ksp: { type: Number, default: 4 }
    },
    // Pricing configurations
    pricing: {
        baseServiceFee: { type: Number, default: 100 },
        taxRate: { type: Number, default: 12 }, // GST etc.
        minWalletRecharge: { type: Number, default: 500 },
        walletDiscountPercentage: { type: Number, default: 0 }
    },
    // Platform meta
    platform: {
        name: { type: String, default: 'KrishiNex' },
        contactEmail: { type: String, default: 'support@krishinex.com' },
        maintenanceMode: { type: Boolean, default: false }
    }
}, { timestamps: true });

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
