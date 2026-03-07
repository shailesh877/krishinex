const express = require('express');
const router = express.Router();
const SellRequest = require('../models/SellRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/sell/submit
// @desc    Farmer submits a new sell request
// @access  Private
router.post('/submit', protect, async (req, res) => {
    try {
        const { cropName, variety, quantity, expectedPrice, mandiId, moisture, bagCount, notes, images } = req.body;

        if (!cropName || !quantity || !expectedPrice || !mandiId) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const sellRequest = await SellRequest.create({
            farmer: req.user.id,
            cropName,
            variety,
            quantity,
            expectedPrice,
            mandi: mandiId,
            moisture,
            bagCount,
            notes,
            images
        });

        // Notify Admins or nearby Buyers (Simple system notification for now)
        await Notification.create({
            user: req.user.id, // For the farmer themselves
            title: 'Sell Request Submitted',
            titleHi: 'बिक्री अनुरोध सबमिट किया गया',
            messageEn: `Your request for ${cropName} has been submitted.`,
            messageHi: `${cropName} के लिए आपका अनुरोध सबमिट कर दिया गया है।`,
            type: 'system'
        });

        res.status(201).json(sellRequest);
    } catch (e) {
        console.error('Submit sell request error:', e);
        res.status(500).json({ error: 'Failed to submit sell request' });
    }
});

// @route   GET /api/sell/my-requests
// @desc    Farmer views their own requests
// @access  Private
router.get('/my-requests', protect, async (req, res) => {
    try {
        const requests = await SellRequest.find({ farmer: req.user.id })
            .populate('mandi', 'name')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (e) {
        console.error('Fetch my sell requests error:', e);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// @route   GET /api/sell/nearby
// @desc    Get requests for specific mandi (for buyers/admin)
// @access  Private
router.get('/nearby', protect, async (req, res) => {
    try {
        const { mandiId } = req.query;
        if (!mandiId) {
            return res.status(400).json({ error: 'Mandi ID is required' });
        }

        const requests = await SellRequest.find({ mandi: mandiId, status: 'pending' })
            .populate('farmer', 'name phone address')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (e) {
        console.error('Fetch nearby requests error:', e);
        res.status(500).json({ error: 'Failed to fetch nearby requests' });
    }
});

// @route   PUT /api/sell/:id/status
// @desc    Update request status (Accept/Cancel)
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const request = await SellRequest.findById(req.params.id).populate('farmer');

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        request.status = status;
        await request.save();

        // Notify farmer about status change
        await Notification.create({
            user: request.farmer._id,
            title: 'Sell Request Update',
            titleHi: 'बिक्री अनुरोध अपडेट',
            messageEn: `Your sell request status is now: ${status}`,
            messageHi: `आपके बिक्री अनुरोध का स्टेटस अब ${status} है।`,
            type: 'system'
        });

        res.json(request);
    } catch (e) {
        console.error('Update sell status error:', e);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
