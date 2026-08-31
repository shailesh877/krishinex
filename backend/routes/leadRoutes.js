const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect, checkAdmin } = require('../middleware/authMiddleware');

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

// @route   GET /api/leads/admin/all
// @desc    Get all loan applications (Admin only)
// @access  Private/Admin
router.get('/admin/all', protect, checkAdmin, async (req, res) => {
    try {
        const leads = await Lead.find()
            .populate('user', 'name phone')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching leads' });
    }
});

// @route   PUT /api/leads/status/:id
// @desc    Update lead status (Admin only)
// @access  Private/Admin
router.put('/status/:id', protect, checkAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        lead.status = status;
        await lead.save();
        res.json(lead);
    } catch (error) {
        console.error('Update lead status error:', error);
        res.status(500).json({ error: 'Failed to update lead status' });
    }
});

// @route   PUT /api/leads/admin/update/:id
// @desc    Update lead details (Admin only)
// @access  Private/Admin
router.put('/admin/update/:id', protect, checkAdmin, async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    } catch (error) {
        console.error('Update lead detail error:', error);
        res.status(500).json({ error: 'Failed to update lead data' });
    }
});

module.exports = router;
