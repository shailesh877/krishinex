const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
// Optional: If you have auth middleware, use it for admin routes
// const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all states
// @route   GET /api/locations/states
router.get('/states', async (req, res) => {
    try {
        const states = await Location.find({ status: 'active' }).select('state');
        res.json(states.map(s => s.state));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get districts for a state
// @route   GET /api/locations/districts/:state
router.get('/districts/:state', async (req, res) => {
    try {
        const location = await Location.findOne({ state: req.params.state, status: 'active' });
        if (!location) return res.status(404).json({ message: 'State not found' });
        res.json(location.districts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN ROUTES (Ideally protected)

// @desc    Add or update a state with districts
// @route   POST /api/locations
router.post('/', async (req, res) => {
    const { state, districts } = req.body;
    console.log('POST /api/locations', { state, districts });
    try {
        let location = await Location.findOne({ state });
        if (location) {
            location.districts = districts;
            await location.save();
        } else {
            location = await Location.create({ state, districts });
        }
        res.status(201).json(location);
    } catch (err) {
        console.error('POST /api/locations error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Update a location by ID
// @route   PUT /api/locations/:id
router.put('/:id', async (req, res) => {
    const { state, districts } = req.body;
    try {
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            { state, districts },
            { new: true }
        );
        if (!location) return res.status(404).json({ message: 'Location not found' });
        res.json(location);
    } catch (err) {
        console.error('PUT /api/locations/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get all locations (Admin)
// @route   GET /api/locations
router.get('/', async (req, res) => {
    try {
        const locations = await Location.find().sort({ state: 1 });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @desc    Delete a state
// @route   DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
    try {
        await Location.findByIdAndDelete(req.params.id);
        res.json({ message: 'Location deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
