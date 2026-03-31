const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const User = require('../models/User');
const Machine = require('../models/Machine');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { sendNotification } = require('../services/notificationService');

// @route   GET /api/rentals/my-bookings
// @desc    Get all rental bookings for the current farmer
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
    console.log('GET /api/rentals/my-bookings hit, user:', req.user.id);
    try {
        const rentals = await Rental.find({ buyer: req.user.id })
            .populate('machine', 'name category village priceHour priceDay images')
            .populate('owner', 'name phone')
            .sort({ createdAt: -1 });
        res.json(rentals);
    } catch (error) {
        console.error('Fetch my machine bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch your bookings' });
    }
});

// @route   GET /api/rentals/equipment
// @desc    Get all rental requests for the equipment owner
// @access  Private
router.get('/equipment', protect, async (req, res) => {
    try {
        const rentals = await Rental.find({ owner: req.user.id })
            .populate('machine', 'name priceDay priceHour distanceKm village images')
            .populate('buyer', 'name phone address profilePhotoUrl')
            .sort({ createdAt: -1 });
        res.json(rentals);
    } catch (error) {
        console.error('Fetch equipment rentals error:', error);
        res.status(500).json({ error: 'Failed to fetch rentals' });
    }
});

// @route   GET /api/rentals/dashboard
// @desc    Get dashboard stats for equipment owner (total + today bookings)
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const rentals = await Rental.find({ owner: req.user.id });
        const totalBookings = rentals.length;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayBookings = rentals.filter(r => new Date(r.createdAt) >= startOfDay).length;

        res.json({ totalBookings, todayBookings });
    } catch (error) {
        console.error('Fetch rental dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// @route   PATCH /api/rentals/:id/status
// @desc    Update rental status
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status, cancelReason, otp } = req.body;
        const validStatuses = ['New', 'Accepted', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const rental = await Rental.findOne({ _id: req.params.id, owner: req.user.id });
        if (!rental) {
            return res.status(404).json({ error: 'Rental request not found' });
        }

        const previousStatus = rental.status;

        // Verify OTP if marking as Completed
        if (status === 'Completed' && previousStatus !== 'Completed') {
            if (rental.completionOTP) {
                if (!otp || String(otp) !== String(rental.completionOTP)) {
                    return res.status(400).json({ error: 'Invalid OTP. Please ask the Farmer for the 4-digit code.' });
                }
            }
        }

        rental.status = status;
        if (status === 'Cancelled' && cancelReason) {
            rental.cancelReason = cancelReason;
        }

        // Check for conflicts if marking as Accepted
        if (status === 'Accepted' && previousStatus !== 'Accepted') {
            const overlaps = await Rental.find({
                _id: { $ne: rental._id },
                machine: rental.machine,
                status: { $in: ['Accepted', 'In Progress'] },
                $or: [
                    { fromDate: { $lt: rental.toDate }, toDate: { $gt: rental.fromDate } }
                ]
            });

            if (overlaps.length > 0) {
                return res.status(400).json({ error: 'Another booking already exists for this time slot. Cannot accept this request.' });
            }

            // Generate OTP
            if (!rental.completionOTP) {
                rental.completionOTP = Math.floor(1000 + Math.random() * 9000).toString();
            }
        }

        rental.status = status;
        if (status === 'Cancelled' && cancelReason) {
            rental.cancelReason = cancelReason;
        }

        await rental.save();

        // Wallet Credit + Debit Logic on Completion
        if (status === 'Completed' && previousStatus !== 'Completed') {
            const amount = rental.totalAmount || 0;
            const settings = await Settings.getSettings();
            const commPercent = settings.commissions.equipment || 0;

            const commissionAmount = Math.round(amount * (commPercent / 100));
            const payoutAmount = amount - commissionAmount;

            // 1. Credit Equipment Owner wallet (Net Payout)
            const owner = await User.findById(rental.owner);
            if (owner) {
                owner.walletBalance = (owner.walletBalance || 0) + payoutAmount;
                await owner.save();

                await Transaction.create({
                    transactionId: `RENT-OWN-${rental._id}-${Date.now()}`,
                    recipient: owner._id,
                    module: 'Equipment',
                    amount: payoutAmount,
                    totalAmount: amount,
                    commissionAmount: commissionAmount,
                    type: 'Credit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: rental._id,
                    note: `Equipment Rental Payout #${rental._id.toString().slice(-6)} (Total: ₹${amount}, Commission: ₹${commissionAmount})`
                });

                // 4. Dynamic Auto-Repayment (If owner has debt and wallet balance, sweep it)
                const { processAutoRepayment } = require('../services/repaymentService');
                await processAutoRepayment(owner._id, rental._id);

                console.log(`[RENTAL] Credited ₹${payoutAmount} to owner ${owner.name} (Commission: ₹${commissionAmount})`);
            }

            // 2. Credit Admin wallet (Commission)
            const admin = await User.findOne({ role: 'admin' });
            if (admin) {
                admin.walletBalance = (admin.walletBalance || 0) + commissionAmount;
                await admin.save();

                await Transaction.create({
                    transactionId: `RENT-ADM-${rental._id}-${Date.now()}`,
                    recipient: admin._id,
                    module: 'Platform',
                    amount: commissionAmount,
                    totalAmount: amount,
                    type: 'Credit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: rental._id,
                    note: `Commission from Equipment Rental #${rental._id.toString().slice(-6)}`
                });
                console.log(`[RENTAL] Credited ₹${commissionAmount} commission to Admin`);
            }

            // 3. DEDUCT from Farmer (buyer) wallet
            const buyer = await User.findById(rental.buyer);
            if (buyer) {
                buyer.walletBalance = (buyer.walletBalance || 0) - amount;
                await buyer.save();

                await Transaction.create({
                    transactionId: `${rental.paymentMode === 'WALLET' ? 'RENT-WAL-BUY' : 'RENT-CS-BUY'}-${rental._id}-${Date.now()}`,
                    recipient: buyer._id,
                    module: 'Equipment',
                    amount: amount,
                    type: 'Debit',
                    paymentMode: rental.paymentMode === 'WALLET' ? 'NexCard Wallet' : 'Cash',
                    status: 'Completed',
                    referenceId: rental._id,
                    note: `Equipment Rental Payment #${rental._id.toString().slice(-6)}`
                });
                console.log(`[RENTAL] Deducted ₹${amount} from buyer ${buyer.name} (${rental.paymentMode})`);
            }
        }

        // Notify the FARMER (buyer) about status change
        const machineName = rental.machine ? (await Machine.findById(rental.machine))?.name || 'Machine' : 'Machine';
        if (status === 'Accepted') {
            await sendNotification(rental.buyer, {
                title: '🚜 Equipment Booking Accepted',
                messageEn: `Your booking for ${machineName} has been accepted by the owner! Your OTP is ${rental.completionOTP}.`,
                messageHi: `${machineName} की बुकिंग Owner ने स्वीकार कर ली है! आपका OTP है: ${rental.completionOTP}.`,
                type: 'booking',
                refId: rental._id.toString()
            });
        } else if (status === 'Completed') {
            await sendNotification(rental.buyer, {
                title: '✅ Equipment Rental Completed',
                messageEn: `Your rental of ${machineName} has been marked as completed. Payment has been processed.`,
                messageHi: `${machineName} की रेंटल पूरी हो गई है। पेमेंट हो गया है।`,
                type: 'booking',
                refId: rental._id.toString()
            });
        } else if (status === 'Cancelled') {
            await sendNotification(rental.buyer, {
                title: '❌ Equipment Booking Cancelled',
                messageEn: `Your booking for ${machineName} has been cancelled.`,
                messageHi: `${machineName} की बुकिंग रद्द कर दी गई है।`,
                type: 'booking',
                refId: rental._id.toString()
            });
        }

        res.json({ message: `Rental status updated to ${status}`, rental });
    } catch (error) {
        console.error('Update rental status error:', error);
        res.status(500).json({ error: 'Failed to update rental status' });
    }
});

// @route   POST /api/rentals/book
// @desc    Book a machine (Rental)
// @access  Private
router.post('/book', protect, async (req, res) => {
    try {
        const { machineId, fromDate, toDate, priceType, amount } = req.body;

        if (!machineId || !fromDate || !toDate || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const machine = await Machine.findById(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Check for double booking (Only block if another booking is already Accepted or In Progress)
        const overlaps = await Rental.find({
            machine: machineId,
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
        if (req.body.paymentMethod !== 'wallet') {
            return res.status(400).json({ error: 'Only Wallet payment is accepted for Equipment bookings.' });
        }

        let paymentMode = 'WALLET';
        finalAmount = amount; // No discount for equipment 

            const user = await User.findById(req.user.id);
            const userBalance = user.walletBalance || 0;
            if (userBalance < finalAmount) {
                return res.status(400).json({ error: `Insufficient wallet balance. Need ₹${finalAmount}` });
            }
            // No deduction at booking time per user request - deduct on completion.

        const settings = await Settings.getSettings();
        const commissionPercent = settings.commissions?.equipment || 5;
        const platformCommission = Math.round((finalAmount * commissionPercent) / 100);
        const ownerPayout = finalAmount - platformCommission;

        const rental = await Rental.create({
            machine: machineId,
            owner: machine.owner,
            buyer: req.user.id,
            fromDate,
            toDate,
            totalAmount: finalAmount,
            platformCommission,
            ownerPayout,
            priceType: priceType || 'daily',
            hours: req.body.hours !== undefined ? req.body.hours : (priceType === 'hourly' ? 1 : 0),
            days: req.body.days !== undefined ? req.body.days : (priceType === 'daily' ? 1 : 0),
            purpose: req.body.purpose || '',
            paymentMode,
            discountApplied,
            status: 'New'
        });

        // No transaction at booking time - created on completion.

        // Notify Owner
        const { sendNotification } = require('../services/notificationService');
        const durationStr = priceType === 'hourly' ? `${req.body.hours || 1} घंटे` : `${req.body.days || 1} दिन`;
        const durationStrEn = priceType === 'hourly' ? `${req.body.hours || 1} Hours` : `${req.body.days || 1} Days`;
        
        await sendNotification(machine.owner, {
            user: machine.owner,
            title: '🚜 New Rental Request',
            messageEn: `New request for "${machine.name}" for ${durationStrEn}. Purpose: ${req.body.purpose || 'Not specified'}.`,
            messageHi: `"${machine.name}" के लिए ${durationStr} का नया अनुरोध मिला है। उद्देश्य: ${req.body.purpose || 'नहीं बताया'}.`,
            type: 'order',
            refId: rental._id.toString()
        }).catch(() => { });

        res.status(201).json({ message: 'Booking successful', rental });
    } catch (error) {
        console.error('Book equipment error:', error);
        res.status(500).json({ error: 'Failed to book equipment' });
    }
});

// @route   GET /api/rentals/wallet
// @desc    Get wallet balance and transaction history for equipment owner
// @access  Private
router.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance');
        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            balance: user ? user.walletBalance : 0,
            transactions
        });
    } catch (error) {
        console.error('Fetch Rental Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

// @route   GET /api/rentals/check-availability
// @desc    Check if a machine is available for a given time range
// @access  Private
router.get('/check-availability', protect, async (req, res) => {
    try {
        const { machineId, fromDate, toDate } = req.query;

        if (!machineId || !fromDate || !toDate) {
            return res.status(400).json({ error: 'Missing machineId, fromDate, or toDate' });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);

        // Find overlapping bookings that are NOT cancelled or pending
        const overlaps = await Rental.find({
            machine: machineId,
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

module.exports = router;
