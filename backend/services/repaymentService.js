const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Ledger = require('../models/Ledger');
const mongoose = require('mongoose');

/**
 * Automatically repays outstanding Agri-Credit from the farmer's wallet balance.
 * This ensures that a farmer's wallet balance is always used to settle debt first.
 * 
 * @param {string} userId - The ID of the farmer/user
 * @param {string} sourceReferenceId - Optional reference ID (e.g. Order ID or Recharge ID)
 * @returns {Promise<{repayAmount: number}>}
 */
const processAutoRepayment = async (userId, sourceReferenceId = null) => {
    try {
        const farmer = await User.findById(userId);
        if (!farmer) return { repayAmount: 0 };

        const creditUsed = Number(farmer.creditUsed || 0);
        const walletBalance = Number(farmer.walletBalance || 0);

        if (creditUsed <= 0 || walletBalance <= 0) {
            return { repayAmount: 0 };
        }

        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('[REPAYMENT] No admin found to receive repayment');
            return { repayAmount: 0 };
        }

        const repayAmount = Math.min(walletBalance, creditUsed);
        
        if (repayAmount > 0) {
            // 1. Update Farmer
            farmer.walletBalance -= repayAmount;
            farmer.creditUsed -= repayAmount;
            await farmer.save();

            // 2. Update Admin
            adminUser.walletBalance = (adminUser.walletBalance || 0) + repayAmount;
            await adminUser.save();

            // 3. Create Transaction Records
            // Debit for Farmer
            await Transaction.create({
                transactionId: `REPAY-DR-${userId}-${Date.now()}`,
                recipient: farmer._id,
                module: 'Shop',
                amount: repayAmount,
                type: 'Debit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: sourceReferenceId,
                note: `Auto-repayment of Agri-Credit (Udhaar) from Wallet Balance`
            });

            // Credit for Admin
            await Transaction.create({
                transactionId: `REPAY-CR-ADM-${userId}-${Date.now()}`,
                recipient: adminUser._id,
                module: 'Shop',
                amount: repayAmount,
                type: 'Credit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: sourceReferenceId,
                note: `Agri-Credit recovered from Farmer: ${farmer.name} (${farmer.phone})`
            });

            // 4. Ledger Sync (Bahi-Khata): Shop Partner ka dues clear karo
            try {
                // Find all shops where this farmer has positive net due
                const outstandingDues = await Ledger.aggregate([
                    { $match: { farmerId: farmer._id } },
                    {
                        $group: {
                            _id: '$shopId',
                            netDue: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$method', 'DUE'] }, '$amount',
                                        { $cond: [{ $eq: ['$method', 'RECOVERY'] }, { $multiply: ['$amount', -1] }, 0] }
                                    ]
                                }
                            }
                        }
                    },
                    { $match: { netDue: { $gt: 0 } } }
                ]);

                let remainingRepay = repayAmount;
                for (const due of outstandingDues) {
                    if (remainingRepay <= 0) break;
                    
                    const recoveryForThisShop = Math.min(remainingRepay, due.netDue);
                    if (recoveryForThisShop > 0) {
                        // Bhai, agr ye recovery platform wala udhaar settle kr rhi hai toh shop ledger me entry ki jrurat nhi hai
                        // kyunki shop ko uska paisa sale ke time pr hi admin se mil gya tha.
                        // Hum sirf record tab krenge jb shop ka personal udhaar recover ho (bhavishya ke liye).
                        
                        /* 
                        await Ledger.create({
                             shopId: due._id, 
                             farmerId: farmer._id,
                             amount: recoveryForThisShop,
                             type: 'PAYMENT',
                             method: 'RECOVERY',
                             note: `Auto-repayment from Farmer Wallet Balance`
                        });
                        */

                        remainingRepay -= recoveryForThisShop;
                        console.log(`[REPAYMENT] Platform Recovery: ₹${recoveryForThisShop} for farmer ${farmer.name}. (Shop Ledger skipped to avoid double-payout/mismatch)`);
                    }
                }
            } catch (ledgerErr) {
                console.error('[REPAYMENT] Ledger sync error (non-blocking):', ledgerErr);
            }

            console.log(`[REPAYMENT] Successfully recovered ₹${repayAmount} from Farmer ${farmer.name}`);
            return { repayAmount };
        }

        return { repayAmount: 0 };
    } catch (error) {
        console.error('[REPAYMENT] Error during auto-repayment:', error);
        return { repayAmount: 0 };
    }
};

module.exports = {
    processAutoRepayment
};
