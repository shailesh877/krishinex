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
            await sendNotification(dr._id, {
                title: 'New Consultation Request',
                messageEn: `Farmer ${name} has a query regarding ${cropName}.`,
                messageHi: `किसान ${name} का ${cropName} से जुड़ा एक सवाल है।`,
                type: 'system',
                refId: consultation._id.toString()
            }).catch(() => {});
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
        console.log('[DOCTOR] Fetching all consultations for admin...');
        const { startDate, endDate, all, search, status } = req.query;
        let andConditions = [];

        if (all !== 'true' && startDate && endDate) {
            andConditions.push({
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            });
        }

        if (status && status !== 'All' && status !== '') {
            andConditions.push({ status: status });
        }

        if (search && search.trim() !== '') {
            const s = search.trim();
            const matchingFarmers = await User.find({
                 $or: [ { address: { $regex: s, $options: 'i' } } ]
            }).select('_id');
            const farmerIds = matchingFarmers.map(f => f._id);
            
            andConditions.push({
                $or: [
                    { name: { $regex: s, $options: 'i' } },
                    { cropName: { $regex: s, $options: 'i' } },
                    { phone: { $regex: s, $options: 'i' } },
                    { farmer: { $in: farmerIds } }
                ]
            });
        }

        let query = andConditions.length > 0 ? { $and: andConditions } : {};

        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined || req.query.paginated === 'true';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 25));
        const skip = (page - 1) * limit;
        const total = await DoctorConsultation.countDocuments(query);

        let findQuery = DoctorConsultation.find(query)
            .populate('farmer', 'name phone address')
            .populate('assignedTo', 'name phone')
            .sort({ createdAt: -1 });

        if (isPaginated) {
            findQuery = findQuery.skip(skip).limit(limit);
        }

        const consultations = await findQuery;
        console.log(`[DOCTOR] Found ${consultations.length} consultations.`);

        if (isPaginated) {
            return res.json({
                data: consultations,
                total,
                page,
                limit,
                hasMore: (skip + consultations.length) < total
            });
        }

        res.json(consultations);
    } catch (error) {
        console.error('Fetch all consultations error:', error);
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

// @route   GET /api/doctor/admin/field-executives
// @desc    Get all field executives for assignment
// @access  Private (Employee)
router.get('/admin/field-executives', protect, async (req, res) => {
    try {
        console.log('[DOCTOR] Fetching ALL field executives for assignment...');
        const executives = await User.find({ 
            role: 'field_executive'
        }).select('name phone businessName status');
        console.log(`[DOCTOR] Found ${executives.length} field executives.`);
        res.json(executives);
    } catch (error) {
        console.error('Fetch field executives error:', error);
        res.status(500).json({ error: 'Failed to fetch field executives' });
    }
});

// @route   GET /api/doctor/admin/:id
// @desc    Get single consultation details
// @access  Private (Employee)
router.get('/admin/:id', protect, async (req, res) => {
    try {
        const consultation = await DoctorConsultation.findById(req.params.id)
            .populate('farmer', 'name phone address profilePhotoUrl');
        if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
        res.json(consultation);
    } catch (error) {
        console.error('Fetch single consultation error:', error);
        res.status(500).json({ error: 'Failed to fetch consultation details' });
    }
});

// @route   PATCH /api/doctor/admin/:id/status
// @desc    Update consultation status
// @access  Private (Employee)
router.patch('/admin/:id/status', protect, async (req, res) => {
    try {
        const { status, resolvedNote } = req.body;
        const validStatuses = ['Pending', 'Contacted', 'Resolved', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updateData = { status };
        if (status === 'Resolved' && resolvedNote) {
            updateData.resolvedNote = resolvedNote;
        }

        const consultation = await DoctorConsultation.findByIdAndUpdate(
            req.params.id,
            updateData,
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

// @route   PATCH /api/doctor/admin/:id/assign
// @desc    Assign consultation to a field executive
// @access  Private (Employee)
router.patch('/admin/:id/assign', protect, async (req, res) => {
    try {
        const { executiveId } = req.body;
        if (!executiveId) return res.status(400).json({ error: 'Executive ID is required' });

        const executive = await User.findById(executiveId);
        if (!executive || executive.role !== 'field_executive') {
            return res.status(404).json({ error: 'Field Executive not found' });
        }

        console.log(`[DOCTOR] Assigning consultation ${req.params.id} to executive ${executiveId}`);
        const consultation = await DoctorConsultation.findByIdAndUpdate(
            req.params.id,
            { assignedTo: executiveId },
            { new: true }
        ).populate('assignedTo', 'name phone');

        if (!consultation) {
            console.warn(`[DOCTOR] Consultation ${req.params.id} not found for assignment`);
            return res.status(404).json({ error: 'Consultation not found' });
        }
        console.log('[DOCTOR] Assignment successful.');

        // Notify Executive
        await sendNotification(executiveId, {
            title: 'New Consultation Assigned',
            messageEn: `You have been assigned a new consultation request from ${consultation.name}.`,
            messageHi: `आपको ${consultation.name} से एक नया परामर्श अनुरोध सौंपा गया है।`,
            type: 'doctor_consultation',
            refId: consultation._id.toString()
        }).catch(() => {});

        res.json({ message: 'Assigned successfully', consultation });
    } catch (error) {
        console.error('Assign consultation error:', error);
        res.status(500).json({ error: 'Failed to assign consultation' });
    }
});

// @route   GET /api/doctor/executive/my-assignments
// @desc    Get consultations assigned to the current field executive
// @access  Private (Field Executive/Employee)
router.get('/executive/my-assignments', protect, async (req, res) => {
    try {
        const list = await DoctorConsultation.find({ assignedTo: req.user.id })
            .populate('farmer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(list);
    } catch (error) {
        console.error('Fetch executive assignments error:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

module.exports = router;

