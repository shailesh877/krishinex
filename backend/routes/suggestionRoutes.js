const express = require('express');
const router = express.Router();
const Suggestion = require('../models/Suggestion');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/suggestions/latest
// @desc    Get the latest active suggestion
// @access  Public
router.get('/latest', async (req, res) => {
    try {
        const suggestion = await Suggestion.findOne({ active: true }).sort({ createdAt: -1 });
        if (!suggestion) {
            return res.status(404).json({ message: 'No active suggestion found' });
        }
        res.json(suggestion);
    } catch (error) {
        console.error('Fetch latest suggestion error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestion' });
    }
});

// @route   POST /api/suggestions
// @desc    Create a new suggestion (Admin/Employee)
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { titleEn, titleHi, contentEn, contentHi } = req.body;

        if (!contentEn || !contentHi) {
            return res.status(400).json({ error: 'English and Hindi content are required' });
        }

        const suggestion = await Suggestion.create({
            titleEn,
            titleHi,
            contentEn,
            contentHi
        });

        res.status(201).json(suggestion);
    } catch (error) {
        console.error('Create suggestion error:', error);
        res.status(500).json({ error: 'Failed to create suggestion' });
    }
});

module.exports = router;
