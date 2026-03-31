const express = require('express');
const router = express.Router();
const Suggestion = require('../models/Suggestion');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer for Suggestion images
const uploadDir = path.join(__dirname, '../uploads/suggestions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `suggestion-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

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

// @route   GET /api/suggestions/all
// @desc    Get all active suggestions
// @access  Public
router.get('/all', async (req, res) => {
    try {
        const suggestions = await Suggestion.find({ active: true }).sort({ createdAt: -1 });
        res.json(suggestions);
    } catch (error) {
        console.error('Fetch all suggestions error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// @route   POST /api/suggestions
// @desc    Create a new suggestion (Admin/Employee)
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        const { titleEn, titleHi, contentEn, contentHi } = req.body;

        const suggestionData = {
            titleEn,
            titleHi,
            contentEn,
            contentHi
        };

        if (req.file) {
            suggestionData.imageUrl = `uploads/suggestions/${req.file.filename}`;
        }

        const suggestion = await Suggestion.create(suggestionData);
        res.status(201).json(suggestion);
    } catch (error) {
        console.error('Create suggestion error:', error);
        res.status(500).json({ error: 'Failed to create suggestion' });
    }
});

// @route   DELETE /api/suggestions/:id
// @desc    Delete a suggestion
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const suggestion = await Suggestion.findById(req.params.id);
        if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        await Suggestion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Suggestion removed' });
    } catch (error) {
        console.error('Delete suggestion error:', error);
        res.status(500).json({ error: 'Failed to delete suggestion' });
    }
});

module.exports = router;
