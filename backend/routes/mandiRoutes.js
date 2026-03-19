const express = require('express');
const router = express.Router();
const Mandi = require('../models/Mandi');
const MandiPrice = require('../models/MandiPrice');
const Crop = require('../models/Crop');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/mandi
// @desc    Get all active mandis
// @access  Public
router.get('/', async (req, res) => {
    try {
        const mandis = await Mandi.find({ status: 'active' }).sort({ name: 1 });
        res.json(mandis);
    } catch (e) {
        console.error('Fetch mandis error:', e);
        res.status(500).json({ error: 'Failed to fetch mandis' });
    }
});

// @route   GET /api/mandi/prices
// @desc    Get prices for a specific mandi and crop for last 7 days
// @access  Public
router.get('/prices', async (req, res) => {
    try {
        const { mandiId, cropName } = req.query;
        if (!mandiId || !cropName) {
            return res.status(400).json({ error: 'Mandi ID and Crop Name are required' });
        }

        // Fetch prices sorted by date descending, limit to last 7 entries
        const prices = await MandiPrice.find({
            mandi: mandiId,
            cropName: cropName
        })
            .sort({ date: -1 })
            .limit(7);

        res.json(prices);
    } catch (e) {
        console.error('Fetch mandi prices error:', e);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// @route   POST /api/mandi/bulk-update
// @desc    Update multiple prices for a mandi and crop (Admin only)
// @access  Private
router.post('/bulk-update', protect, async (req, res) => {
    try {
        const { mandiId, cropName, prices } = req.body; // prices: [{ date: '2023-10-01', price: 2000 }, ...]

        if (!mandiId || !cropName || !Array.isArray(prices)) {
            return res.status(400).json({ error: 'Mandi ID, Crop Name and Prices array are required' });
        }

        const results = [];
        for (const item of prices) {
            // item.date is 'YYYY-MM-DD'. We want UTC midnight for that specific date.
            const [year, month, day] = item.date.split('-').map(Number);
            const priceDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

            const updated = await MandiPrice.findOneAndUpdate(
                { mandi: mandiId, cropName, date: priceDate },
                { price: item.price },
                { upsert: true, new: true }
            );
            results.push(updated);
        }

        res.json({ success: true, count: results.length, data: results });
    } catch (e) {
        console.error('Bulk update mandi prices error:', e);
        res.status(500).json({ error: 'Failed to bulk update prices' });
    }
});

// @route   POST /api/mandi/update

// @route   POST /api/mandi/create
// @desc    Create a new Mandi (Admin only)
// @access  Private
router.post('/create', protect, async (req, res) => {
    try {
        const { name, location } = req.body;
        const mandi = await Mandi.create({ name, location });
        res.status(201).json(mandi);
    } catch (e) {
        console.error('Create mandi error:', e);
        res.status(500).json({ error: 'Failed to create mandi' });
    }
});

// @route   GET /api/mandi/crops
// @desc    Get all active crops
// @access  Public
router.get('/crops', async (req, res) => {
    try {
        const crops = await Crop.find({ status: 'active' }).sort({ name: 1 });
        res.json(crops);
    } catch (e) {
        console.error('Fetch crops error:', e);
        res.status(500).json({ error: 'Failed to fetch crops' });
    }
});

// @route   POST /api/mandi/crops
// @desc    Create a new Crop (Admin only)
// @access  Private
router.post('/crops', protect, async (req, res) => {
    try {
        const { name, hindiName, icon } = req.body;
        const crop = await Crop.create({ name, hindiName, icon });
        res.status(201).json(crop);
    } catch (e) {
        console.error('Create crop error:', e);
        res.status(500).json({ error: 'Failed to create crop' });
    }
});

// @route   DELETE /api/mandi/crops/:id
// @desc    Delete a Crop (Admin only)
// @access  Private
router.delete('/crops/:id', protect, async (req, res) => {
    try {
        console.log(`[DEBUG] Attempting to delete crop ID: ${req.params.id}`);
        const crop = await Crop.findByIdAndDelete(req.params.id);
        if (!crop) {
            console.log(`[DEBUG] Crop not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Crop not found' });
        }
        console.log(`[DEBUG] Crop deleted successfully: ${req.params.id}`);
        res.json({ message: 'Crop deleted successfully' });
    } catch (e) {
        console.error('Delete crop error:', e);
        res.status(500).json({ error: 'Failed to delete crop' });
    }
});

// @route   DELETE /api/mandi/:id
// @desc    Delete a Mandi (Admin only)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        console.log(`[DEBUG] Attempting to delete mandi ID: ${req.params.id}`);
        const mandi = await Mandi.findByIdAndDelete(req.params.id);
        if (!mandi) {
            console.log(`[DEBUG] Mandi not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Mandi not found' });
        }
        // Also delete associated prices
        await MandiPrice.deleteMany({ mandi: req.params.id });
        console.log(`[DEBUG] Mandi deleted successfully: ${req.params.id}`);
        res.json({ message: 'Mandi deleted successfully' });
    } catch (e) {
        console.error('Delete mandi error:', e);
        res.status(500).json({ error: 'Failed to delete mandi' });
    }
});

module.exports = router;
