const express = require('express');
const router = express.Router();
const SoilRequest = require('../models/SoilRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `soil_report_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @route   GET /api/soil/dashboard
// @desc    Get dashboard metrics for the soil lab
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const labId = req.user.id;

        // Lifetime stats
        const totalRequests = await SoilRequest.countDocuments({ lab: labId });
        const totalCompleted = await SoilRequest.countDocuments({ lab: labId, status: 'Completed' });

        // Today stats calculation
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayNew = await SoilRequest.countDocuments({
            lab: labId,
            status: 'New',
            createdAt: { $gte: startOfToday }
        });

        const todayAccepted = await SoilRequest.countDocuments({
            lab: labId,
            status: 'Accepted',
            createdAt: { $gte: startOfToday }
        });

        const todayInProgress = await SoilRequest.countDocuments({
            lab: labId,
            status: 'InProgress',
            createdAt: { $gte: startOfToday }
        });

        const todayCompleted = await SoilRequest.countDocuments({
            lab: labId,
            status: 'Completed',
            createdAt: { $gte: startOfToday }
        });

        res.json({
            lifetime: {
                totalRequests,
                totalCompleted
            },
            today: {
                new: todayNew,
                accepted: todayAccepted,
                inProgress: todayInProgress,
                completed: todayCompleted
            }
        });
    } catch (error) {
        console.error('Soil dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard metrics' });
    }
});

// @route   GET /api/soil/requests
// @desc    Get all requests for the soil lab
// @access  Private
router.get('/requests', protect, async (req, res) => {
    try {
        const requests = await SoilRequest.find({ lab: req.user.id })
            .populate('farmer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Fetch soil requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// @route   PATCH /api/soil/requests/:id/status
// @desc    Update soil request status with optional report PDF
// @access  Private
router.patch('/requests/:id/status', protect, upload.single('report'), async (req, res) => {
    try {
        let { status, reportNote } = req.body;
        if (!status) {
            console.log('[SOIL ERROR] Status missing in req.body. Body:', req.body);
            return res.status(400).json({ error: 'status is required in request body' });
        }
        const request = await SoilRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Soil request not found' });
        }

        // Must be the owner lab or an admin
        if (request.lab.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ error: 'Not authorized for this request' });
        }

        const previousStatus = request.status;
        const previousPaymentStatus = request.paymentStatus;
        
        request.status = status;
        if (reportNote) request.advisoryText = reportNote;

        if (req.file) {
            const baseUrl = process.env.BASE_URL || `http://${req.hostname}:5500`;
            request.reportUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }

        // --- Payment Logic (User -> Lab + Admin) ---
        // Trigger if moving to any active status AND not yet paid
        const activeStatuses = ['Accepted', 'InProgress', 'Completed'];
        const shouldPay = activeStatuses.includes(status) && request.paymentStatus !== 'Completed';
        
        console.log(`[SOIL DEBUG] Status: ${status}, Prev: ${previousStatus}, ShouldPay: ${shouldPay}, Method: ${request.paymentMethod}, Paid: ${request.paymentStatus}`);

        if (shouldPay && request.paymentMethod === 'wallet') {
            const Settings = require('../models/Settings');
            const Transaction = require('../models/Transaction');
            const User = require('../models/User');

            const farmer = await User.findById(request.farmer);
            const lab = await User.findById(request.lab);
            const settings = await Settings.getSettings();
            
            const amount = request.price || 250;
            const commPercent = settings.commissions?.soil || 10;
            const commissionAmount = Math.round(amount * (commPercent / 100));
            const payoutAmount = amount - commissionAmount;

            console.log(`[SOIL PAYMENT] Details - Farmer: ${farmer?._id}, Lab: ${lab?._id}, Amount: ${amount}, Comm%: ${commPercent}`);

            if (farmer && lab) {
                // 1. DEDUCT from Farmer
                if (farmer.walletBalance < amount) {
                    console.log(`[SOIL PAYMENT] Error: Insufficient balance for farmer ${farmer._id}`);
                    return res.status(400).json({ error: 'Farmer has insufficient wallet balance to proceed with this request.' });
                }
                
                farmer.walletBalance -= amount;
                await farmer.save();

                // Farmer Debit Transaction
                await Transaction.create({
                    transactionId: `SOIL-DR-${request._id}-${Date.now()}`,
                    recipient: farmer._id,
                    module: 'Soil',
                    amount: amount,
                    type: 'Debit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: request._id,
                    note: `Payment for Soil Test Request #${request._id.toString().slice(-6)}`
                });

                // 2. CREDIT Net Payout to Lab
                lab.walletBalance = (lab.walletBalance || 0) + payoutAmount;
                await lab.save();

                // Lab Credit Transaction
                await Transaction.create({
                    transactionId: `SOIL-CR-${request._id}-${Date.now()}`,
                    recipient: lab._id,
                    module: 'Soil',
                    amount: payoutAmount,
                    totalAmount: amount,
                    commissionAmount: commissionAmount,
                    type: 'Payout',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: request._id,
                    note: `Payment for Soil Test #${request._id.toString().slice(-6)} (Total: ₹${amount}, Commission: ₹${commissionAmount})`
                });

                // 3. CREDIT Commission to Admin
                const admin = await User.findOne({ role: 'admin' });
                if (admin) {
                    admin.walletBalance = (admin.walletBalance || 0) + commissionAmount;
                    await admin.save();

                    await Transaction.create({
                        transactionId: `SOIL-ADM-${request._id}-${Date.now()}`,
                        recipient: admin._id,
                        module: 'Platform',
                        amount: commissionAmount,
                        totalAmount: amount,
                        type: 'Credit',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: request._id,
                        note: `Commission from Soil Test #${request._id.toString().slice(-6)}`
                    });
                }

                // Update request payment status
                request.paymentStatus = 'Completed';
                request.paidAt = new Date();
                console.log(`[SOIL PAYMENT] Successfully processed: Farmer -₹${amount}, Lab +₹${payoutAmount}, Admin +₹${commissionAmount}`);
            }
        }

        // Final save for status, reportUrl, paymentStatus, etc.
        await request.save();

        // Optionally send a notification to the farmer
        let notifMsgHi = '';
        let notifMsgEn = '';

        if (status === 'Accepted') {
            notifMsgHi = `आपकी मिट्टी जांच (Req: ${request._id.toString().slice(-4)}) लैब द्वारा स्वीकार कर ली गई है।`;
            notifMsgEn = `Your soil test request (${request._id.toString().slice(-4)}) was accepted by the lab.`;
        } else if (status === 'InProgress') {
            notifMsgHi = `आपके सैंपल की जांच शुरू हो गई है।`;
            notifMsgEn = `Testing has started for your soil sample.`;
        } else if (status === 'Completed') {
            notifMsgHi = `आपकी मिट्टी जांच रिपोर्ट आ गई है!`;
            notifMsgEn = `Your soil test report is ready!`;
        }

        if (notifMsgHi) {
            const { sendNotification } = require('../services/notificationService');
            await sendNotification(request.farmer, {
                title: 'Soil Test Update',
                messageEn: notifMsgEn,
                messageHi: notifMsgHi,
                type: 'soil_test',
                refId: request._id.toString()
            }).catch(() => {});
        }

        res.json(request);
    } catch (error) {
        console.error('Soil request update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// @route   GET /api/soil/wallet
// @desc    Get wallet balance and transaction history for soil lab
// @access  Private
router.get('/wallet', protect, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id).select('walletBalance');
        const Transaction = require('../models/Transaction');
        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            balance: user ? user.walletBalance : 0,
            transactions
        });
    } catch (error) {
        console.error('Fetch Soil Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

module.exports = router;
