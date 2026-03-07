const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/orders
// @desc    Buyer creates a new order request
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { crop, quantity, variety, location, note } = req.body;

        if (!crop || !quantity || !location) {
            return res.status(400).json({ error: 'Crop, quantity, and location are required.' });
        }

        const order = await Order.create({
            buyer: req.user.id,
            crop,
            quantity,
            variety: variety || '',
            location,
            note: note || ''
        });

        // Auto-notify buyer
        await Notification.create({
            user: req.user.id,
            title: 'Order Request Submitted',
            messageEn: `Your request for ${quantity} qtl of ${crop} at ${location} has been submitted. We'll update you soon.`,
            messageHi: `${location} पर ${quantity} क्विंटल ${crop} की आपकी रिक्वेस्ट भेज दी गई है। हम जल्द अपडेट देंगे।`,
            type: 'order',
            refId: order._id.toString()
        }).catch(() => { }); // silent fail

        res.status(201).json({
            message: 'Order request created successfully',
            order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// @route   GET /api/orders/my/stats
// @desc    Get total order count + total spend for this buyer
// @access  Private
router.get('/my/stats', protect, async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id });
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalAmount = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        res.json({ totalOrders, totalAmount, completedOrders: completedOrders.length });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// @route   GET /api/orders/equipment/stats
// @desc    Get total assigned orders + today's assigned orders for Equipment
// @access  Private
router.get('/equipment/stats', protect, async (req, res) => {
    try {
        const orders = await Order.find({ assignedTo: req.user.id });
        const totalBookings = orders.length;

        // Count today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayBookings = orders.filter(o => new Date(o.createdAt) >= startOfDay).length;

        res.json({ totalBookings, todayBookings });
    } catch (error) {
        console.error('Equipment stats error:', error);
        res.status(500).json({ error: 'Failed to fetch equipment stats' });
    }
});

// @route   GET /api/orders/assigned
// @desc    Get orders assigned to this user (Farmer/Partner)
// @access  Private
router.get('/assigned', protect, async (req, res) => {
    try {
        const orders = await Order.find({ assignedTo: req.user.id })
            .populate('buyer', 'name phone')
            .populate('mandi', 'name location')
            .sort({ createdAt: -1 });

        // Map to match frontend Order type
        const mappedOrders = orders.map(o => ({
            id: o._id.toString(),
            buyerName: o.buyer?.name || o.farmerName || 'Trader',
            buyerPhone: o.buyer?.phone || o.farmerMobile || '',
            address: o.mandi?.name || o.location,
            distance: '—', // Calculated if needed
            region: o.mandi?.location || '',
            quantity: o.quantity,
            price: `₹${o.pricePerQuintal || 0}`,
            payment: o.payment || 'COD',
            status: o.status,
            crop: o.crop,
            cancelReason: o.cancelReason
        }));

        res.json(mappedOrders);
    } catch (error) {
        console.error('Fetch assigned orders error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned orders' });
    }
});

// @route   PATCH /api/orders/:id/assigned-status
// @desc    Buyer updates their action on an assigned order (ok / delivered / cancelled)
// @access  Private
router.patch('/:id/assigned-status', protect, async (req, res) => {
    try {
        const { assignedStatus, cancelReason } = req.body;
        console.log(`[ORDER-DEBUG] Updating status: ID=${req.params.id}, User=${req.user.id}, Status=${assignedStatus}`);

        const validStatuses = ['new', 'ok', 'delivered', 'cancelled'];
        if (!validStatuses.includes(assignedStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const update = { assignedStatus };
        if (assignedStatus === 'cancelled' && cancelReason) {
            update.cancelReason = cancelReason;
        }
        if (assignedStatus === 'delivered') {
            update.status = 'completed';
        }

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user.id },
            update,
            { new: true }
        );

        if (!order) {
            console.log(`[ORDER-DEBUG] Order not found for update: ID=${req.params.id}, User=${req.user.id}`);
            return res.status(404).json({ error: 'Order not found or not assigned to you' });
        }

        console.log(`[ORDER-DEBUG] Status updated successfully for ID=${order._id}`);
        res.json({ message: 'Status updated', order });
    } catch (error) {
        console.error('Assigned status update error:', error);
        const logEntry = `[${new Date().toISOString()}] UPDATE_ERROR: ${error.message}\nStack: ${error.stack}\n`;
        try { require('fs').appendFileSync('order_debug.log', logEntry); } catch (i) { }
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
});

// @route   GET /api/orders/my
// @desc    Get all orders for the logged-in buyer
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id })
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Fetch my orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// @route   GET /api/orders
// @desc    Get all orders (for admin/employee view)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('buyer', 'name phone')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Fetch all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (admin/employee)
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Status updated', order });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
