const express = require('express');
const router = express.Router();
const { protect, checkAdmin, checkModule } = require('../middleware/authMiddleware');
const Settings = require('../models/Settings');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @route   GET /api/settings
// @desc    Get platform settings
// @access  Private/Admin
router.get('/', protect, checkModule('settings'), async (req, res) => {
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
router.put('/', protect, checkModule('settings'), async (req, res) => {
    try {
        const { commissions, pricing, platform } = req.body;
        if (commissions) {
            const updateObj = {};
            for (const key in commissions) {
                updateObj[`commissions.${key}`] = commissions[key];
            }
            const updated = await Settings.findOneAndUpdate({}, { $set: updateObj }, { new: true, upsert: true });
            return res.json({ message: 'Settings updated successfully', settings: updated });
        }

        if (pricing) {
            const updateObj = {};
            for (const key in pricing) {
                updateObj[`pricing.${key}`] = pricing[key];
            }
            const updated = await Settings.findOneAndUpdate({}, { $set: updateObj }, { new: true, upsert: true });
            return res.json({ message: 'Settings updated successfully', settings: updated });
        }

        if (platform) {
            const updateObj = {};
            for (const key in platform) {
                updateObj[`platform.${key}`] = platform[key];
            }
            const updated = await Settings.findOneAndUpdate({}, { $set: updateObj }, { new: true, upsert: true });
            return res.json({ message: 'Settings updated successfully', settings: updated });
        }

        res.json({ message: 'No updates provided' });
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// @route   PUT /api/settings/password
// @desc    Change admin password
// @access  Private/Admin
router.put('/password', protect, checkModule('settings'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        let isMatch = false;
        if (user.password.startsWith('$2') || user.password.length > 30) {
            isMatch = await bcrypt.compare(currentPassword, user.password);
        } else {
            isMatch = currentPassword === user.password;
        }

        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
