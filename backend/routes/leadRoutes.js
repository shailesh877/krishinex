const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/leads
// @desc    Submit a new loan application lead
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const leadData = {
            ...req.body,
            user: req.user.id
        };

        const lead = new Lead(leadData);
        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Loan application submitted successfully',
            lead
        });
    } catch (error) {
        console.error('Lead submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error submitting lead'
        });
    }
});

// @route   GET /api/leads/my-leads
// @desc    Get current user's loan applications
// @access  Private
router.get('/my-leads', protect, async (req, res) => {
    try {
        const leads = await Lead.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        console.error('Fetch leads error:', error);
        res.status(500).json({ error: 'Server error fetching leads' });
    }
});

module.exports = router;
