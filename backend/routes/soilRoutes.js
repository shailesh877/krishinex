const express = require('express');
const router = express.Router();
const SoilRequest = require('../models/SoilRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `soil_report_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @route   GET /api/soil/dashboard
// @desc    Get dashboard metrics for the soil lab
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const labId = req.user.id;

        // Lifetime stats
        const totalRequests = await SoilRequest.countDocuments({ lab: labId });
        const totalCompleted = await SoilRequest.countDocuments({ lab: labId, status: 'Completed' });

        // Today stats calculation
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayNew = await SoilRequest.countDocuments({
            lab: labId,
            status: 'New',
            createdAt: { $gte: startOfToday }
        });

        const todayAccepted = await SoilRequest.countDocuments({
            lab: labId,
            status: 'Accepted',
            createdAt: { $gte: startOfToday }
        });

        const todayInProgress = await SoilRequest.countDocuments({
            lab: labId,
            status: 'InProgress',
            createdAt: { $gte: startOfToday }
        });

        const todayCompleted = await SoilRequest.countDocuments({
            lab: labId,
            status: 'Completed',
            createdAt: { $gte: startOfToday }
        });

        res.json({
            lifetime: {
                totalRequests,
                totalCompleted
            },
            today: {
                new: todayNew,
                accepted: todayAccepted,
                inProgress: todayInProgress,
                completed: todayCompleted
            }
        });
    } catch (error) {
        console.error('Soil dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard metrics' });
    }
});

// @route   GET /api/soil/requests
// @desc    Get all requests for the soil lab
// @access  Private
router.get('/requests', protect, async (req, res) => {
    try {
        const requests = await SoilRequest.find({ lab: req.user.id })
            .populate('farmer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Fetch soil requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// @route   PATCH /api/soil/requests/:id/status
// @desc    Update soil request status with optional report PDF
// @access  Private
router.patch('/requests/:id/status', protect, upload.single('report'), async (req, res) => {
    try {
        const { status, reportNote } = req.body;
        const request = await SoilRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Soil request not found' });
        }

        // Must be the owner lab
        if (request.lab.toString() !== req.user.id) {
            return res.status(401).json({ error: 'Not authorized for this request' });
        }

        request.status = status;
        if (reportNote) request.advisoryText = reportNote;

        if (req.file) {
            request.reportUrl = `https://krishinex.com/uploads/${req.file.filename}`;
        }

        await request.save();

        // Optionally send a notification to the farmer
        let notifMsgHi = '';
        let notifMsgEn = '';

        if (status === 'Accepted') {
            notifMsgHi = `आपकी मिट्टी जांच (Req: ${request._id.toString().slice(-4)}) लैब द्वारा स्वीकार कर ली गई है।`;
            notifMsgEn = `Your soil test request (${request._id.toString().slice(-4)}) was accepted by the lab.`;
        } else if (status === 'InProgress') {
            notifMsgHi = `आपके सैंपल की जांच शुरू हो गई है।`;
            notifMsgEn = `Testing has started for your soil sample.`;
        } else if (status === 'Completed') {
            notifMsgHi = `आपकी मिट्टी जांच रिपोर्ट आ गई है!`;
            notifMsgEn = `Your soil test report is ready!`;
        }

        if (notifMsgHi) {
            await Notification.create({
                user: request.farmer,
                title: 'Soil Test Update',
                titleHi: 'मिट्टी जांच अपडेट',
                titleEn: 'Soil Test Update',
                messageHi: notifMsgHi,
                messageEn: notifMsgEn,
                type: 'system'
            });
        }

        res.json(request);
    } catch (error) {
        console.error('Soil request update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
