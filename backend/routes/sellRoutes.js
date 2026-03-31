const express = require('express');
const router = express.Router();
const SellRequest = require('../models/SellRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for crop images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/crops/');
        console.log('Multer destination:', dir);
        if (!fs.existsSync(dir)) {
            console.log('Creating directory:', dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const name = 'crop-' + uniqueSuffix + path.extname(file.originalname);
        console.log('Multer filename:', name);
        cb(null, name);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Increase to 10MB limit per file
});

// @route   POST /api/sell/upload-images
// @desc    Upload up to 4 crop images
// @access  Private
router.post('/upload-images', protect, (req, res, next) => {
    console.log('--- POST /api/sell/upload-images hit ---');
    upload.array('images', 4)(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: `Multer error: ${err.message}` });
        } else if (err) {
            console.error('Unknown upload error:', err);
            return res.status(500).json({ error: `Upload error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Files received:', req.files ? req.files.length : 0);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const imageUrls = req.files.map(file => `uploads/crops/${file.filename}`);
        console.log('Image URLs:', imageUrls);
        res.status(200).json({ imageUrls });
    } catch (error) {
        console.error('Upload images try-catch error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// @route   POST /api/sell/submit
// @desc    Farmer submits a new sell request
// @access  Private
router.post('/submit', protect, async (req, res) => {
    try {
        const { cropName, variety, quantity, expectedPrice, mandiId, moisture, bagCount, notes, images } = req.body;

        if (!cropName || !quantity || !expectedPrice || !mandiId) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const currentCommissionRate = settings.commissions?.buyerTrading || 0;

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
            images,
            commissionRate: currentCommissionRate
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
            .populate('assignedTo', 'name businessName')
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
