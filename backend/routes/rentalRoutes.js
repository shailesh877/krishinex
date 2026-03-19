const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
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

        // Generate OTP if marking as Accepted
        if (status === 'Accepted' && previousStatus !== 'Accepted' && !rental.completionOTP) {
            rental.completionOTP = Math.floor(1000 + Math.random() * 9000).toString();
        }

        await rental.save();

        // Wallet Credit + Debit Logic on Completion
        if (status === 'Completed' && previousStatus !== 'Completed') {
            const User = require('../models/User');
            const Transaction = require('../models/Transaction');
            const amount = rental.totalAmount || 0;

            // 1. Credit Equipment Owner wallet
            const owner = await User.findById(rental.owner);
            if (owner) {
                owner.walletBalance = (owner.walletBalance || 0) + amount;
                await owner.save();

                await Transaction.create({
                    transactionId: `RENT-OWN-${rental._id}-${Date.now()}`,
                    recipient: owner._id,
                    module: 'Equipment',
                    amount: amount,
                    type: 'Credit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: rental._id,
                    note: `Equipment Rental Payment #${rental._id.toString().slice(-6)}`
                });
                console.log(`[RENTAL] Credited ₹${amount} to owner ${owner.name}`);
            }

            // 2. Deduct Farmer (buyer) wallet
            const buyer = await User.findById(rental.buyer);
            if (buyer) {
                buyer.walletBalance = (buyer.walletBalance || 0) - amount;
                await buyer.save();

                await Transaction.create({
                    transactionId: `RENT-BUY-${rental._id}-${Date.now()}`,
                    recipient: buyer._id,
                    module: 'Equipment',
                    amount: amount,
                    type: 'Debit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: rental._id,
                    note: `Equipment Rental Payment #${rental._id.toString().slice(-6)}`
                });
                console.log(`[RENTAL] Deducted ₹${amount} from buyer ${buyer.name}`);
            }
        }

        // Notify the FARMER (buyer) about status change
        const machineName = rental.machine ? (await require('../models/Machine').findById(rental.machine))?.name || 'Machine' : 'Machine';
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

        const machine = await require('../models/Machine').findById(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const rental = await Rental.create({
            machine: machineId,
            owner: machine.owner,
            buyer: req.user.id,
            fromDate,
            toDate,
            totalAmount: amount,
            priceType: priceType || 'daily',
            hours: req.body.hours !== undefined ? req.body.hours : (priceType === 'hourly' ? 1 : 0),
            days: req.body.days !== undefined ? req.body.days : (priceType === 'daily' ? 1 : 0),
            status: 'New'
        });

        // Notify Owner
        const { sendNotification } = require('../services/notificationService');
        await sendNotification(machine.owner, {
            user: machine.owner,
            title: 'New Rental Request',
            messageEn: `You have a new rental request for "${machine.name}".`,
            messageHi: `आपको "${machine.name}" के लिए एक नया रental अनुरोध मिला है।`,
            type: 'order',
            refId: rental._id.toString()
        }).catch(() => {});

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
        console.error('Fetch Rental Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

module.exports = router;
