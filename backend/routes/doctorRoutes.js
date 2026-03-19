const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notificationService');
const User = require('../models/User');
const DoctorConsultation = require('../models/DoctorConsultation');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer config for issue images

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, `issue_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// @route   POST /api/doctor/consult
// @desc    Submit a doctor consultation form
// @access  Private
router.post('/consult', protect, upload.single('image'), async (req, res) => {
    try {
        const { name, phone, cropName, issue } = req.body;
        
        if (!name || !phone || !cropName || !issue) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }

        const baseUrl = process.env.BASE_URL || 'https://demo.ranx24.com';
        const imageUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : '';

        const consultation = await DoctorConsultation.create({
            farmer: req.user.id,
            name,
            phone,
            cropName,
            issue,
            imageUrl,
            status: 'Pending'
        });

        // Notify Admin/Doctor (For now, let's notify any employee with 'doctor' module)
        const doctors = await User.find({ role: 'employee', employeeModules: 'doctor', status: 'approved' });
        
        for (const dr of doctors) {
            await sendNotification(
                dr._id,
                'New Consultation Request',
                `Farmer ${name} has a query regarding ${cropName}.`,
                `किसान ${name} का ${cropName} से जुड़ा एक सवाल है।`,
                'system',
                consultation._id.toString()
            ).catch(() => {});
        }

        res.status(201).json({ message: 'Consultation submitted successfully', consultation });
    } catch (error) {
        console.error('Submit consultation error:', error);
        res.status(500).json({ error: 'Failed to submit consultation' });
    }
});

// @route   GET /api/doctor/my-consultations
// @desc    Get all consultation requests of the current farmer
// @access  Private
router.get('/my-consultations', protect, async (req, res) => {
    try {
        const list = await DoctorConsultation.find({ farmer: req.user.id }).sort({ createdAt: -1 });
        res.json(list);
    } catch (error) {
        console.error('Fetch consultations error:', error);
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

// @route   GET /api/doctor/admin/all
// @desc    Get all consultation requests (for Admin/Employees)
// @access  Private (Employee)
router.get('/admin/all', protect, async (req, res) => {
    try {
        const consultations = await DoctorConsultation.find()
            .populate('farmer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(consultations);
    } catch (error) {
        console.error('Fetch all consultations error:', error);
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

// @route   PATCH /api/doctor/admin/:id/status
// @desc    Update consultation status
// @access  Private (Employee)
router.patch('/admin/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Contacted', 'Resolved', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const consultation = await DoctorConsultation.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!consultation) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        res.json({ message: `Status updated to ${status}`, consultation });
    } catch (error) {
        console.error('Update consultation status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;

