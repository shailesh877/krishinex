const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

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
            .populate('machine', 'name priceDay priceHour distanceKm village')
            .populate('buyer', 'name phone')
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
        const { status, cancelReason } = req.body;
        const validStatuses = ['New', 'Accepted', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const rental = await Rental.findOne({ _id: req.params.id, owner: req.user.id });
        if (!rental) {
            return res.status(404).json({ error: 'Rental request not found' });
        }

        rental.status = status;
        if (status === 'Cancelled' && cancelReason) {
            rental.cancelReason = cancelReason;
        }

        await rental.save();

        const hiAction = status === 'Accepted' ? 'स्वीकार' : status === 'Completed' ? 'पूर्ण' : 'रद्द';
        await Notification.create({
            user: req.user.id,
            title: 'Rental Request Updated',
            messageEn: `You have marked the rental request as ${status}.`,
            messageHi: `आपने रेंटल रिक्वेस्ट को ${hiAction} कर दिया है।`,
            type: 'status',
            refId: rental._id.toString()
        });

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
            status: 'New'
        });

        // Notify Owner
        await Notification.create({
            user: machine.owner,
            title: 'New Rental Request',
            messageEn: `You have a new rental request for "${machine.name}".`,
            messageHi: `आपको "${machine.name}" के लिए एक नया रेंटल अनुरोध मिला है।`,
            type: 'order',
            refId: rental._id.toString()
        });

        res.status(201).json({ message: 'Booking successful', rental });
    } catch (error) {
        console.error('Book equipment error:', error);
        res.status(500).json({ error: 'Failed to book equipment' });
    }
});

module.exports = router;
