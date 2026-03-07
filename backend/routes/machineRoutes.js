const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Config for multiple machine images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/machines/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   POST /api/machines
// @desc    Add a new machine
// @access  Private
router.post('/', protect, upload.array('images', 3), async (req, res) => {
    try {
        const { machineName, priceDay, priceHour, desc, distanceKm, village, category } = req.body;

        const imageUrls = req.files ? req.files.map(file => `/uploads/machines/${file.filename}`) : [];

        const machine = await Machine.create({
            owner: req.user.id,
            name: machineName,
            priceDay: Number(priceDay) || 0,
            priceHour: Number(priceHour) || 0,
            desc: desc || '',
            distanceKm: Number(distanceKm) || 0,
            village: village || '',
            category: category || 'other',
            images: imageUrls
        });

        await Notification.create({
            user: req.user.id,
            title: 'Machine Added',
            messageEn: `Your machine "${machineName}" has been added successfully.`,
            messageHi: `आपकी मशीन "${machineName}" सफलतापूर्वक जुड़ गई है।`,
            type: 'system',
        });

        res.status(201).json({ message: 'Machine added successfully', machine });
    } catch (error) {
        console.error('Add machine error:', error);
        res.status(500).json({ error: 'Failed to add machine' });
    }
});

// @route   GET /api/machines/my
// @desc    Get user's machines
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const machines = await Machine.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.json(machines);
    } catch (error) {
        console.error('Fetch my machines error:', error);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

// @route   GET /api/machines/public
// @desc    Get all machines with filters (public for farmers)
// @access  Private
router.get('/public', protect, async (req, res) => {
    try {
        const { search, maxDistance, category } = req.query;
        console.log('Public machines request:', req.query);
        let query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (category && category !== 'all') {
            query.category = { $regex: category, $options: 'i' };
        }

        if (maxDistance && maxDistance !== 'null') {
            query.distanceKm = { $lte: Number(maxDistance) };
        }

        console.log('Final machine query:', query);
        const machines = await Machine.find(query)
            .populate('owner', 'name phone address profilePhotoUrl')
            .sort({ createdAt: -1 });

        res.json(machines);
    } catch (error) {
        console.error('Fetch public machines error:', error);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

// @route   PUT /api/machines/:id
// @desc    Update a machine
// @access  Private
router.put('/:id', protect, upload.array('images', 3), async (req, res) => {
    try {
        const machine = await Machine.findOne({ _id: req.params.id, owner: req.user.id });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const { name, priceDay, priceHour, desc, distanceKm, village, existingImages } = req.body;

        let imageUrls = [];
        if (existingImages) {
            imageUrls = Array.isArray(existingImages) ? existingImages : [existingImages];
        }

        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => `/uploads/machines/${file.filename}`);
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        machine.name = name || machine.name;
        machine.priceDay = priceDay !== undefined ? Number(priceDay) : machine.priceDay;
        machine.priceHour = priceHour !== undefined ? Number(priceHour) : machine.priceHour;
        machine.desc = desc !== undefined ? desc : machine.desc;
        machine.distanceKm = distanceKm !== undefined ? Number(distanceKm) : machine.distanceKm;
        machine.village = village !== undefined ? village : machine.village;
        machine.images = imageUrls.slice(0, 3); // Max 3 images

        await machine.save();

        await Notification.create({
            user: req.user.id,
            title: 'Machine Updated',
            messageEn: `Your machine "${machine.name}" has been updated.`,
            messageHi: `आपकी मशीन "${machine.name}" अपडेट कर दी गई है।`,
            type: 'system',
        });

        res.json({ message: 'Machine updated successfully', machine });
    } catch (error) {
        console.error('Update machine error:', error);
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

// @route   DELETE /api/machines/:id
// @desc    Delete a machine
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const machine = await Machine.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        await Notification.create({
            user: req.user.id,
            title: 'Machine Deleted',
            messageEn: `Your machine "${machine.name}" has been removed.`,
            messageHi: `आपकी मशीन "${machine.name}" हटा दी गई है।`,
            type: 'system',
        });

        res.json({ message: 'Machine deleted successfully' });
    } catch (error) {
        console.error('Delete machine error:', error);
        res.status(500).json({ error: 'Failed to delete machine' });
    }
});

module.exports = router;
