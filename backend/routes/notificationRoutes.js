const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user (newest first)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count for badge
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user.id, unread: true });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { unread: false }
        );
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.patch('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, unread: true },
            { unread: false }
        );
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a single notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// @route   POST /api/notifications (internal — called by other routes to create notifications)
// @desc    Create a notification for a user (admin/system use)
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { userId, title, messageEn, messageHi, type, refId } = req.body;
        const notification = await Notification.create({
            user: userId || req.user.id,
            title,
            messageEn,
            messageHi: messageHi || messageEn,
            type: type || 'system',
            refId: refId || ''
        });
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

module.exports = router;
