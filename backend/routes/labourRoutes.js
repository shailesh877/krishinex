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
            .populate('labour', 'name phone')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Fetch my labour bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch your labour bookings' });
    }
});

// @route   GET /api/labour/public
// @desc    Get all labourers with filters
// @access  Private
router.get('/public', protect, async (req, res) => {
    try {
        const { search, maxDistance } = req.query;
        let query = { role: 'labour', status: 'approved' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'labourDetails.skills': { $regex: search, $options: 'i' } }
            ];
        }

        if (maxDistance && maxDistance !== 'null') {
            query.maxDistanceKm = { $lte: Number(maxDistance) };
        }

        const labourers = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(labourers);
    } catch (error) {
        console.error('Fetch public labour error:', error);
        res.status(500).json({ error: 'Failed to fetch labour' });
    }
});

// @route   POST /api/labour/book
// @desc    Book a labourer
// @access  Private
router.post('/book', protect, async (req, res) => {
    try {
        const { labourId, workType, amount, date } = req.body;

        if (!labourId || !workType || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const job = await LabourJob.create({
            labour: labourId,
            farmer: req.user.id,
            workType,
            amount,
            status: 'Pending',
            createdAt: date || new Date()
        });

        // Notify Labour
        await Notification.create({
            user: labourId,
            title: 'New Job Request',
            messageEn: `You have a new job request for ${workType}.`,
            messageHi: `आपको ${workType} के लिए एक नया काम का अनुरोध मिला है।`,
            type: 'order',
            refId: job._id.toString()
        });

        res.status(201).json({ message: 'Booking successful', job });
    } catch (error) {
        console.error('Book labour error:', error);
        res.status(500).json({ error: 'Failed to book labour' });
    }
});

// Get Dashboard Stats for Labour Partner
router.get('/dashboard', protect, async (req, res) => {
    try {
        // Find orders assigned to this user representing labour jobs
        // Assuming Order schema can track labour assignments via assignedTo
        const orders = await Order.find({ assignedTo: req.user.id });
        const totalRequests = orders.length;

        const completed = orders.filter(o => o.assignedStatus === 'completed' || o.assignedStatus === 'delivered').length;

        res.json({ totalRequests, completed });
    } catch (error) {
        console.error('Fetch labour dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get all bookings assigned to this user
router.get('/bookings', protect, async (req, res) => {
    try {
        const bookings = await Order.find({ assignedTo: req.user.id })
            .populate('buyer', 'name phone address')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Fetch labour bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Update booking status
router.patch('/bookings/:id/status', protect, async (req, res) => {
    try {
        const { status, cancelReason } = req.body;
        // Map frontend statuses: 'new', 'accepted', 'completed', 'remove' -> 'cancelled'
        let assignedStatus = status;
        if (status === 'remove') assignedStatus = 'cancelled';
        if (status === 'accepted') assignedStatus = 'ok';

        const validStatuses = ['new', 'ok', 'completed', 'delivered', 'cancelled'];
        if (!validStatuses.includes(assignedStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const update = { assignedStatus };
        if (assignedStatus === 'cancelled' && cancelReason) {
            update.cancelReason = cancelReason;
        }

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user.id },
            update,
            { new: true }
        );

        if (!order) return res.status(404).json({ error: 'Booking not found' });
        res.json({ message: 'Status updated', order });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
