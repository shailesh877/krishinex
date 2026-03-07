const express = require('express');
const router = express.Router();
const { protect, checkAdmin } = require('../middleware/authMiddleware');
const Settings = require('../models/Settings');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @route   GET /api/settings
// @desc    Get platform settings
// @access  Private/Admin
router.get('/', protect, checkAdmin, async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// @route   PUT /api/settings
// @desc    Update platform settings
// @access  Private/Admin
router.put('/', protect, checkAdmin, async (req, res) => {
    try {
        let settings = await Settings.getSettings();
        const { commissions, pricing, platform } = req.body;

        if (commissions) settings.commissions = { ...settings.commissions, ...commissions };
        if (pricing) settings.pricing = { ...settings.pricing, ...pricing };
        if (platform) settings.platform = { ...settings.platform, ...platform };

        await settings.save();
        res.json({ message: 'Settings updated successfully', settings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// @route   PUT /api/settings/password
// @desc    Change admin password
// @access  Private/Admin
router.put('/password', protect, checkAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        // If password is not hashed (mock state), compare directly
        // But for security we should use bcrypt if it's already there
        // Looking at authRoutes, it seems they might be using plain text or simple comparisons
        // Let's check how they do it in authRoutes.

        let isMatch = false;
        if (user.password.startsWith('$2') || user.password.length > 30) {
            isMatch = await bcrypt.compare(currentPassword, user.password);
        } else {
            isMatch = currentPassword === user.password;
        }

        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Hash new password if we want to be secure, but let's stick to existing pattern
        // If the user's current password was plain, we might want to keep it simple for them 
        // until a full migration. But let's use bcrypt for new ones.
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
