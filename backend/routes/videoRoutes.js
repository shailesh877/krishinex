const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { protect, checkAdmin } = require('../middleware/authMiddleware');

// @route   GET /api/videos
// @desc    Get all active videos for Kisan Pathshala
// @access  Public
router.get('/', async (req, res) => {
    try {
        const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching videos' });
    }
});

// @route   GET /api/videos/admin/all
// @desc    Get all videos for management (Admin only)
// @access  Private/Admin
router.get('/admin/all', protect, checkAdmin, async (req, res) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

function extractYoutubeId(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

// @route   POST /api/videos
// @desc    Add a new video (Admin only)
// @access  Private/Admin
router.post('/', protect, checkAdmin, async (req, res) => {
    try {
        let { titleEn, titleHi, youtubeId, isActive } = req.body;
        if (!titleEn || !titleHi || !youtubeId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        youtubeId = extractYoutubeId(youtubeId.trim());
        const thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        const video = new Video({
            titleEn,
            titleHi,
            youtubeId,
            thumbnail,
            isActive: isActive !== undefined ? isActive : true
        });

        await video.save();
        res.status(201).json(video);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create video' });
    }
});

// @route   PUT /api/videos/:id
// @desc    Update a video (Admin only)
// @access  Private/Admin
router.put('/:id', protect, checkAdmin, async (req, res) => {
    try {
        let { titleEn, titleHi, youtubeId, isActive } = req.body;
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ error: 'Video not found' });

        if (titleEn) video.titleEn = titleEn;
        if (titleHi) video.titleHi = titleHi;
        if (youtubeId) {
            video.youtubeId = extractYoutubeId(youtubeId.trim());
            video.thumbnail = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
        }
        if (isActive !== undefined) video.isActive = isActive;

        await video.save();
        res.json(video);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update video' });
    }
});

// @route   DELETE /api/videos/:id
// @desc    Delete a video (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, checkAdmin, async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) return res.status(404).json({ error: 'Video not found' });
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

module.exports = router;
