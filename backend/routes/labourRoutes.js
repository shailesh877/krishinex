const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const LabourJob = require('../models/LabourJob');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/labour/my-bookings
// @desc    Get all labour job bookings for the current farmer
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
    console.log('GET /api/labour/my-bookings hit, user:', req.user.id);
    try {
        const jobs = await LabourJob.find({ farmer: req.user.id })
            .populate('labour', 'name phone profilePhotoUrl')
            .sort({ createdAt: -1 });

        console.log(`[MY-BOOKINGS] Returning ${jobs.length} jobs. Coords/OTPs:`, jobs.map(j => ({ id: j._id, otp: j.completionOTP })));
        res.json(jobs);
    } catch (error) {
        console.error('Fetch my labour bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch your labour bookings' });
    }
});

// @route   GET /api/labour/public
// @desc    Get all labourers with filters (including proximity)
// @access  Private
router.get('/public', protect, async (req, res) => {
    try {
        const { search, maxDistance, category, userLat, userLng } = req.query;
        let query = { role: 'labour', status: 'approved' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'labourDetails.skills': { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            const regex = new RegExp(category, 'i');
            query['labourDetails.skills'] = { $regex: regex };
        }

        let labourers;
        const radius = (maxDistance && maxDistance !== 'null') ? Number(maxDistance) : null;

        if (radius && !isNaN(radius)) {
            if (!userLat || !userLng) {
                console.log(`[LABOUR_PUBLIC] Distance (${radius}km) requested but no coords provided.`);
                return res.json([]);
            }

            labourers = await User.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [Number(userLng), Number(userLat)]
                        },
                        distanceField: 'distanceKm',
                        maxDistance: radius * 1000, // Distance in meters
                        query: query,
                        spherical: true,
                        distanceMultiplier: 0.001 // Convert meters to km
                    }
                },
                {
                    $project: {
                        password: 0
                    }
                }
            ]);
        } else {
            // No distance filter, use standard find
            labourers = await User.find(query)
                .select('-password')
                .sort({ createdAt: -1 });
        }

        console.log(`[LABOUR_PUBLIC] Query:`, JSON.stringify(query));
        console.log(`[LABOUR_PUBLIC] Found ${labourers.length} results`);
        res.json(labourers);
    } catch (error) {
        console.error('Fetch public labour error:', error);
        res.status(500).json({ error: 'Failed to fetch labour', details: error.message });
    }
});

// @route   POST /api/labour/book
// @desc    Book a labourer
// @access  Private
router.post('/book', protect, async (req, res) => {
    try {
        const { labourId, workType, amount, fromDate, toDate, priceType, hours, days, purpose, paymentMethod } = req.body;

        if (!labourId || !workType || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for double booking (Only block if already Accepted or In Progress)
        const overlaps = await LabourJob.find({
            labour: labourId,
            status: { $in: ['Accepted', 'In Progress'] },
            $or: [
                { fromDate: { $lt: new Date(toDate) }, toDate: { $gt: new Date(fromDate) } }
            ]
        });

        if (overlaps.length > 0) {
            return res.status(400).json({ error: 'This time slot is already booked. Please choose another time.' });
        }

        let discountApplied = 0;
        let finalAmount = amount;
        if (paymentMethod !== 'wallet') {
            return res.status(400).json({ error: 'Only Wallet payment is accepted for Labour bookings.' });
        }

        let paymentMode = 'WALLET';
        finalAmount = amount;

            const user = await User.findById(req.user.id);
            const userBalance = user.walletBalance || 0;
            if (userBalance < finalAmount) {
                return res.status(400).json({ error: `Insufficient wallet balance. Need ₹${finalAmount}` });
            }
            // No deduction at booking time per user request - deduct on completion.

        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const commissionPercent = settings.commissions?.labour || 5;
        const platformCommission = Math.round((finalAmount * commissionPercent) / 100);
        const ownerPayout = finalAmount - platformCommission;

        const job = await LabourJob.create({
            labour: labourId,
            farmer: req.user.id,
            workType,
            amount: finalAmount,
            platformCommission,
            ownerPayout,
            status: 'Pending',
            fromDate: fromDate || new Date(),
            toDate: toDate || new Date(),
            priceType: priceType || 'daily',
            hours: hours || 0,
            days: days || 0,
            purpose: purpose || '',
            paymentMode,
            discountApplied
        });

        // No transaction at booking time - created on completion.

        // Notify Labour
        const { sendNotification } = require('../services/notificationService');
        await sendNotification(labourId, {
            title: 'New Job Request',
            messageEn: `You have a new job request for ${workType}.`,
            messageHi: `आपको ${workType} के लिए एक नया काम का अनुरोध मिला है।`,
            type: 'order',
            refId: job._id.toString()
        }).catch(() => { });

        res.status(201).json({ message: 'Booking successful', job });
    } catch (error) {
        console.error('Book labour error:', error);
        res.status(500).json({ error: 'Failed to book labour' });
    }
});

// @route   GET /api/labour/check-availability
// @desc    Check if a labourer is available for a given time range
// @access  Private
router.get('/check-availability', protect, async (req, res) => {
    try {
        const { labourId, fromDate, toDate } = req.query;

        if (!labourId || !fromDate || !toDate) {
            return res.status(400).json({ error: 'Missing labourId, fromDate, or toDate' });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);

        // Find overlapping bookings that are NOT cancelled or pending
        const overlaps = await LabourJob.find({
            labour: labourId,
            status: { $in: ['Accepted', 'In Progress'] },
            $or: [
                { fromDate: { $lt: end }, toDate: { $gt: start } }
            ]
        });

        res.json({
            available: overlaps.length === 0,
            bookedSlots: overlaps.map(o => ({ from: o.fromDate, to: o.toDate }))
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

// Get Dashboard Stats for Labour Partner
router.get('/dashboard', protect, async (req, res) => {
    try {
        // Find jobs assigned to this labourer
        const jobs = await LabourJob.find({ labour: req.user.id });
        const totalRequests = jobs.length;

        const completed = jobs.filter(j => j.status === 'Completed').length;

        res.json({ totalRequests, completed });
    } catch (error) {
        console.error('Fetch labour dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get all bookings assigned to this user
router.get('/bookings', protect, async (req, res) => {
    try {
        const jobs = await LabourJob.find({ labour: req.user.id })
            .populate('farmer', 'name phone address')
            .sort({ createdAt: -1 });

        // Map LabourJob to shape Partner App expects (Order shape)
        const mappedBookings = jobs.map(j => {
            let assignedStatus = 'new';
            if (j.status === 'Accepted' || j.status === 'In Progress') assignedStatus = 'ok';
            else if (j.status === 'Completed') assignedStatus = 'completed';
            else if (j.status === 'Cancelled') assignedStatus = 'cancelled';

            return {
                ...j.toObject(),
                buyer: j.farmer, // Map farmer to buyer
                assignedStatus: assignedStatus,
                crop: j.workType, // Map workType to crop
                quantity: j.acresCovered || 0,
                location: j.farmer?.address || 'Unknown'
            };
        });

        res.json(mappedBookings);
    } catch (error) {
        console.error('Fetch labour bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Update booking status
router.patch('/bookings/:id/status', protect, async (req, res) => {
    try {
        const { status, cancelReason, otp } = req.body;

        // Map Partner App status to LabourJob status
        let newStatus = 'Pending';
        if (status === 'accepted' || status === 'ok') newStatus = 'Accepted';
        else if (status === 'completed') newStatus = 'Completed';
        else if (status === 'remove' || status === 'cancelled') newStatus = 'Cancelled';
        else if (status === 'in-progress') newStatus = 'In Progress';

        const jobToUpdate = await LabourJob.findOne({ _id: req.params.id, labour: req.user.id });
        if (!jobToUpdate) return res.status(404).json({ error: 'Booking not found' });

        const previousStatus = jobToUpdate.status;

        // 1. If accepting, generate OTP and check for conflicts
        let generatedOTP = jobToUpdate.completionOTP;
        if (newStatus === 'Accepted' && previousStatus !== 'Accepted') {
            const overlaps = await LabourJob.find({
                _id: { $ne: jobToUpdate._id },
                labour: jobToUpdate.labour,
                status: { $in: ['Accepted', 'In Progress'] },
                $or: [
                    { fromDate: { $lt: jobToUpdate.toDate }, toDate: { $gt: jobToUpdate.fromDate } }
                ]
            });

            if (overlaps.length > 0) {
                return res.status(400).json({ error: 'Another booking already exists for this time slot. Cannot accept this request.' });
            }

            if (!generatedOTP) {
                generatedOTP = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit OTP
                console.log(`[OTP_GEN] Generated OTP ${generatedOTP} for job ${req.params.id}`);
            }
        }

        // 2. If completing, verify OTP
        if (newStatus === 'Completed') {
            if (!otp) {
                return res.status(400).json({ error: 'Completion OTP is required' });
            }
            if (otp !== jobToUpdate.completionOTP) {
                return res.status(400).json({ error: 'Invalid Completion OTP' });
            }
        }

        const job = await LabourJob.findOneAndUpdate(
            { _id: req.params.id, labour: req.user.id },
            {
                status: newStatus,
                completionOTP: generatedOTP,
                platformCommission: jobToUpdate.platformCommission || 0, // In case not set yet
                ownerPayout: jobToUpdate.ownerPayout || 0,
                ...(cancelReason && { cancelReason })
            },
            { new: true }
        ).populate('farmer', 'name phone walletBalance');

        // 3. Wallet Transaction Logic on Completion
        if (newStatus === 'Completed' && previousStatus !== 'Completed') {
            const User = require('../models/User');
            const Transaction = require('../models/Transaction');
            const Settings = require('../models/Settings');
            const labourer = await User.findById(req.user.id);
            const farmer = await User.findById(job.farmer._id);
            // Commission logic soon...

            if (labourer && farmer) {
                const settings = await Settings.getSettings();
                const commPercent = settings.commissions.labour || 0;
                const amount = job.amount || 0;
                const commissionAmount = Math.round(amount * (commPercent / 100));
                const payoutAmount = amount - commissionAmount;

                // Sync the job document if not already set or different
                if (job.platformCommission !== commissionAmount || job.ownerPayout !== payoutAmount) {
                    await LabourJob.findByIdAndUpdate(job._id, {
                        platformCommission: commissionAmount,
                        ownerPayout: payoutAmount
                    });
                }

                // 1. DEDUCT from Farmer Wallet
                farmer.walletBalance = (farmer.walletBalance || 0) - amount;
                await farmer.save();

                // Transaction for Farmer (Debit)
                await Transaction.create({
                    transactionId: `${job.paymentMode === 'WALLET' ? 'LAB-WAL-DR' : 'LAB-CS-DR'}-${job._id}-${Date.now()}`,
                    recipient: farmer._id,
                    module: 'Labour',
                    amount: amount,
                    type: 'Debit',
                    paymentMode: job.paymentMode === 'WALLET' ? 'NexCard Wallet' : 'Cash',
                    status: 'Completed',
                    referenceId: job._id,
                    note: `Payment for labour job by ${labourer.name}`
                });

                // 2. ADD Net Payout to Labourer
                labourer.walletBalance = (labourer.walletBalance || 0) + payoutAmount;
                await labourer.save();

                // 3. Labourer Transaction record
                await Transaction.create({
                    transactionId: `LAB-CR-${job._id}-${Date.now()}`,
                    recipient: labourer._id,
                    module: 'Labour',
                    amount: payoutAmount,
                    totalAmount: amount,
                    commissionAmount: commissionAmount,
                    type: 'Payout',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: job._id,
                    note: `Earned from job for ${farmer.name} (Total: ₹${amount}, Commission: ₹${commissionAmount})`
                });

                // 5. Dynamic Auto-Repayment (If labourer has debt and wallet balance, sweep it)
                const { processAutoRepayment } = require('../services/repaymentService');
                await processAutoRepayment(labourer._id, job._id);

                // 4. Admin Transaction record (Commission)
                const admin = await require('../models/User').findOne({ role: 'admin' });
                if (admin) {
                    admin.walletBalance = (admin.walletBalance || 0) + commissionAmount;
                    await admin.save();

                    await Transaction.create({
                        transactionId: `LAB-ADM-${job._id}-${Date.now()}`,
                        recipient: admin._id,
                        module: 'Platform',
                        amount: commissionAmount,
                        totalAmount: amount,
                        type: 'Credit',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: job._id,
                        note: `Commission from Labour Job #${job._id.toString().slice(-6)}`
                    });
                }

                console.log(`[LABOUR_PAYMENT] Job ${job._id}: ₹${amount} split -> Labourer: ₹${payoutAmount}, Admin: ₹${commissionAmount}`);
            }
        }

        res.json({ message: 'Status updated successfully', job });
    } catch (error) {
        console.error('Update labour booking status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// @route   GET /api/labour/wallet
// @desc    Get wallet balance and transaction history for labour partner
// @access  Private
router.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance');
        const Transaction = require('../models/Transaction');
        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            balance: user ? user.walletBalance : 0,
            transactions
        });
    } catch (error) {
        console.error('Fetch Labour Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

module.exports = router;
