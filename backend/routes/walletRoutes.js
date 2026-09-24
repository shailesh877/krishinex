const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

let razorpay;
try {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} catch (err) {
    console.warn("Razorpay key not set. Wallet recharge might fail.");
}

// POST /api/wallet/recharge/create-order
router.post('/recharge/create-order', protect, async (req, res) => {
    try {
        const { amount } = req.body; // Amount in INR
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit
            currency: 'INR',
            receipt: 'rcpt_' + Date.now() + '_' + req.user.id.substring(0, 4),
        };

        const order = await razorpay.orders.create(options);
        if (!order) {
            return res.status(500).json({ error: 'Failed to create Razorpay order' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// POST /api/wallet/recharge/verify
router.post('/recharge/verify', protect, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount // In INR, passed back to easily update wallet
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is verified
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Update user wallet balance safely without triggering full document validation
            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { $inc: { walletBalance: Number(amount) } },
                { new: true }
            );

            // Create Transaction record
            await Transaction.create({
                transactionId: razorpay_payment_id,
                recipient: updatedUser._id,
                module: 'Platform',
                amount: Number(amount),
                type: 'Credit',
                paymentMode: 'Razorpay',
                status: 'Completed',
                note: 'Razorpay Wallet Recharge'
            });

            return res.json({ success: true, message: 'Payment verified and wallet updated', balance: updatedUser.walletBalance });
        } else {
            return res.status(400).json({ error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Verify Payment Error:', error?.message || error);
        if (error?.errors) {
            console.error('Mongoose Validation Errors:', error.errors);
        }
        try {
            require('fs').appendFileSync('wallet_error.txt', `[${new Date().toISOString()}] VERIFY ERROR: ${error?.message || error}\nStack: ${error?.stack}\n`);
        } catch (e) {}
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

module.exports = router;
