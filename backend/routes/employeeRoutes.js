const express = require('express');
const router = express.Router();
const { protect, checkAdmin, checkModule } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');
const Rental = require('../models/Rental');
const Machine = require('../models/Machine');
const SoilRequest = require('../models/SoilRequest');
const { Chat, Message } = require('../models/Chat');
const Item = require('../models/Item');
const ShopOrder = require('../models/ShopOrder');
const Transaction = require('../models/Transaction');
const LabourJob = require('../models/LabourJob');
const SellRequest = require('../models/SellRequest');
const FieldTask = require('../models/FieldTask');
const FranchiseSale = require('../models/FranchiseSale');
const FieldLead = require('../models/FieldLead');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const parseQuantityInQuintals = (qtyStr) => {
    if (!qtyStr) return 0;
    const str = String(qtyStr);
    const quintalMatch = str.match(/\(?([\d.]+)\s*Quintal\)?/i);
    if (quintalMatch) return parseFloat(quintalMatch[1]) || 0;
    if (str.toLowerCase().includes('quintal')) return parseFloat(str) || 0;
    if (str.toLowerCase().includes('kg')) return (parseFloat(str) || 0) / 100;
    return parseFloat(str) || 0;
};

const parsePriceInQuintals = (priceStr) => {
    if (!priceStr) return 0;
    const str = String(priceStr);

    // Extract all numbers that look like prices
    const matches = str.match(/\d+(\.\d+)?/g);
    if (!matches) return 0;

    const prices = matches.map(m => parseFloat(m));

    // If we have "(₹100 / Quintal)" or similar, prioritize that specific number
    const qmatch = str.match(/₹?(\d+(\.\d+)?)\s*\/\s*Quintal/i);
    if (qmatch) return parseFloat(qmatch[1]) || 0;

    // Aggressive heuristic: If "KG" and a higher number is present, it's likely the Quintal rate
    // e.g., "1 / KG (₹100 / Quintal)" -> 100 is higher than 1.
    if (prices.length > 1) {
        return Math.max(...prices);
    }

    // Fallback: If only one number and it says / KG, multiply by 100
    if (str.toLowerCase().includes('/ kg') && prices.length === 1) {
        return prices[0] * 100;
    }

    return prices[0] || 0;
};

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const chatMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || (file.mimetype.includes('audio') ? '.m4a' : '.jpg');
        cb(null, `chat_${Date.now()}${ext}`);
    }
});
const uploadChatMedia = multer({
    storage: chatMediaStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for audio/video
});

const leadPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `lead_${Date.now()}${ext}`);
    }
});
const uploadLeadPhoto = multer({ storage: leadPhotoStorage });

// @route   GET /api/employee/dashboard
// @desc    Get dashboard statistics for specific Employee
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const empId = req.user.id;

        const user = await User.findById(empId).select('employeeModules');
        const allowedModules = user && user.employeeModules && user.employeeModules.length > 0
            ? user.employeeModules
            : ['labour', 'equipment', 'soil', 'doctor'];

        // Calculate exact counts dynamically based on pending/completed models
        // NOTE: We count all assigned tasks regardless of allowedModules to keep overview accurate.
        // Module access will still control visibility of specific action cards.

        // Labour Jobs
        const pendingOrders = await LabourJob.countDocuments({ assignedTo: empId, status: { $in: ['Pending', 'Accepted', 'In Progress'] } });
        const completedOrders = await LabourJob.countDocuments({ assignedTo: empId, status: 'Completed' });
        const totalOrders = await LabourJob.countDocuments({ assignedTo: empId });
        const todayNewOrders = await LabourJob.countDocuments({ assignedTo: empId, createdAt: { $gte: today } });
        const todayPendingOrders = await LabourJob.countDocuments({ assignedTo: empId, status: 'Pending', createdAt: { $gte: today } });
        const todayCompletedOrders = await LabourJob.countDocuments({ assignedTo: empId, status: 'Completed', updatedAt: { $gte: today } });

        // Rentals (Machine Tasks)
        const pendingRentals = await Rental.countDocuments({ assignedFieldExec: empId, status: { $in: ['New', 'Accepted', 'In Progress'] } });
        const completedRentals = await Rental.countDocuments({ assignedFieldExec: empId, status: 'Completed' });
        const totalRentals = await Rental.countDocuments({ assignedFieldExec: empId });
        const todayNewRentals = await Rental.countDocuments({ assignedFieldExec: empId, createdAt: { $gte: today } });
        const todayPendingRentals = await Rental.countDocuments({ assignedFieldExec: empId, status: { $in: ['New', 'Accepted'] }, createdAt: { $gte: today } });
        const todayCompletedRentals = await Rental.countDocuments({ assignedFieldExec: empId, status: 'Completed', updatedAt: { $gte: today } });

        // Soil Requests
        const pendingSoil = await SoilRequest.countDocuments({ lab: empId, status: { $in: ['New', 'Accepted', 'InProgress'] } });
        const completedSoil = await SoilRequest.countDocuments({ lab: empId, status: 'Completed' });
        const totalSoil = await SoilRequest.countDocuments({ lab: empId });
        const todayNewSoil = await SoilRequest.countDocuments({ lab: empId, createdAt: { $gte: today } });
        const todayPendingSoil = await SoilRequest.countDocuments({ lab: empId, status: { $in: ['New', 'Accepted'] }, createdAt: { $gte: today } });
        const todayCompletedSoil = await SoilRequest.countDocuments({ lab: empId, status: 'Completed', updatedAt: { $gte: today } });

        // Doctor Chats
        const pendingChats = await Chat.countDocuments({ doctor: empId, unreadByDoctor: { $gt: 0 } });
        const totalChats = await Chat.countDocuments({ doctor: empId });
        const todayNewChats = await Chat.countDocuments({ doctor: empId, createdAt: { $gte: today } });

        // Field Tasks
        const pendingField = await FieldTask.countDocuments({ executive: empId, status: { $in: ['Pending', 'Accepted'] } });
        const completedField = await FieldTask.countDocuments({ executive: empId, status: 'Completed' });
        const totalField = await FieldTask.countDocuments({ executive: empId });
        const todayNewField = await FieldTask.countDocuments({ executive: empId, createdAt: { $gte: today } });
        const todayPendingField = await FieldTask.countDocuments({ executive: empId, status: { $in: ['Pending', 'Accepted'] }, createdAt: { $gte: today } });
        const todayCompletedField = await FieldTask.countDocuments({ executive: empId, status: 'Completed', updatedAt: { $gte: today } });

        // Total computations
        const totalPending = pendingOrders + pendingRentals + pendingSoil + pendingChats + pendingField;
        const totalCompleted = completedOrders + completedRentals + completedSoil + completedField;
        const totalAssigned = totalOrders + totalRentals + totalSoil + totalChats + totalField;

        // Today computations
        const todayNew = todayNewOrders + todayNewRentals + todayNewSoil + todayNewChats + todayNewField;
        const todayPending = todayPendingOrders + todayPendingRentals + todayPendingSoil + todayPendingField;
        const todayCompleted = todayCompletedOrders + todayCompletedRentals + todayCompletedSoil + todayCompletedField;

        res.json({
            overviewStats: {
                totalAssigned: totalAssigned,
                totalPending: totalPending,
                totalCompleted: totalCompleted,
            },
            todayStats: {
                todayNew: todayNew,
                todayPending: todayPending,
                todayCompleted: todayCompleted,
            },
            access: {
                // Dynamically returning accessible modules for the employee based on User model.
                modules: allowedModules
            }
        });

    } catch (e) {
        console.error('Employee dash error:', e);
        res.status(500).json({ error: 'Server error fetching employee dashboard' });
    }
});

// @route   GET /api/employee/all-tasks
// @desc    Get all tasks/jobs assigned to this employee across all modules
// @access  Private
router.get('/all-tasks', protect, async (req, res) => {
    try {
        const empId = req.user.id;
        const user = await User.findById(empId).select('employeeModules');
        const allowedModules = user && user.employeeModules && user.employeeModules.length > 0
            ? user.employeeModules
            : ['labour', 'equipment', 'soil', 'doctor'];

        let allTasks = [];

        // 1. Labour Jobs
        const jobs = await LabourJob.find({ assignedTo: empId }).populate('farmer', 'name').lean();
        jobs.forEach(j => {
            allTasks.push({
                _id: j._id,
                module: 'labour',
                title: 'Labour Task',
                subtitle: `Farmer: ${j.farmer ? j.farmer.name : 'Unknown'}`,
                status: j.status || 'Pending',
                date: j.createdAt
            });
        });

        // 2. Soil
        const soils = await SoilRequest.find({ lab: empId }).populate('farmer', 'name').lean();
        soils.forEach(s => {
            allTasks.push({
                _id: s._id,
                module: 'soil',
                title: 'Soil Testing Request',
                subtitle: `Farmer: ${s.farmer ? s.farmer.name : 'Unknown'}`,
                status: s.status,
                date: s.createdAt
            });
        });

        // 3. Rentals (Machine tasks)
        const rentals = await Rental.find({ assignedFieldExec: empId }).populate('buyer', 'name').populate('machine', 'name').lean();
        rentals.forEach(r => {
            allTasks.push({
                _id: r._id,
                module: 'equipment',
                title: `Machine: ${r.machine ? r.machine.name : 'Rental'}`,
                subtitle: `Farmer: ${r.buyer ? r.buyer.name : 'Unknown'}`,
                status: r.status,
                date: r.createdAt
            });
        });

        // 4. Doctor Chats
        const chats = await Chat.find({ doctor: empId }).populate('farmer', 'name').lean();
        chats.forEach(c => {
            allTasks.push({
                _id: c._id,
                module: 'doctor',
                title: 'Crop Advisory (Doctor)',
                subtitle: `Farmer: ${c.farmer ? c.farmer.name : 'Unknown'}`,
                status: c.unreadByDoctor > 0 ? 'new message' : 'read',
                date: c.lastTime || c.createdAt
            });
        });

        // 5. Field Tasks (New)
        const fieldTasks = await require('../models/FieldTask').find({ executive: empId }).lean();
        fieldTasks.forEach(ft => {
            allTasks.push({
                _id: ft._id,
                module: 'field',
                title: ft.taskType,
                subtitle: `Partner: ${ft.partnerName} | Loc: ${ft.location}`,
                mobileNumber: ft.mobileNumber,
                status: ft.status || 'Pending',
                date: ft.createdAt
            });
        });

        // Sort by newest first
        allTasks.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(allTasks);
    } catch (e) {
        console.error('All tasks fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch all tasks' });
    }
});

// @route   GET /api/employee/labour-tasks
// @desc    Get all labour tasks (LabourJob) assigned to this employee
// @access  Private
router.get('/labour-tasks', protect, async (req, res) => {
    try {
        const tasks = await LabourJob.find({ assignedTo: req.user.id })
            .populate('farmer', 'name phone address profilePhotoUrl aadhaarNumber location')
            .populate('labour', 'name businessName phone address profilePhotoUrl labourDetails rating')
            .sort({ createdAt: -1 });

        // Map to the shape expected by the frontend (which expects 'Order' like fields)
        const mapped = tasks.map(t => {
            let assignedStatus = 'new';
            if (t.status === 'Accepted' || t.status === 'In Progress') assignedStatus = 'ok';
            else if (t.status === 'Completed') assignedStatus = 'delivered'; // frontend maps delivered to completed
            else if (t.status === 'Cancelled') assignedStatus = 'cancelled';

            return {
                ...t.toObject(),
                buyer: t.farmer, // Map farmer to buyer for frontend compatibility
                crop: t.workType, // Map workType to crop
                quantity: t.acresCovered || t.hoursWorked || 0,
                assignedStatus: assignedStatus
            };
        });

        res.json(mapped);
    } catch (error) {
        console.error('Fetch employee labour tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch labour tasks' });
    }
});

// @route   PATCH /api/employee/labour-tasks/:id/status
// @desc    Update labour task (LabourJob) status
// @access  Private
router.patch('/labour-tasks/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;

        // Map Partner App status to LabourJob status
        let newStatus = 'Pending';
        if (status === 'accepted' || status === 'ok') newStatus = 'Accepted';
        else if (status === 'completed') newStatus = 'Completed';
        else if (status === 'remove' || status === 'cancelled') newStatus = 'Cancelled';
        else if (status === 'in-progress') newStatus = 'In Progress';

        const job = await LabourJob.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user.id },
            { status: newStatus },
            { new: true }
        );

        if (!job) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task status updated', job });
    } catch (error) {
        console.error('Update employee task status error:', error);
        res.status(500).json({ error: 'Failed to update task status' });
    }
});

// @route   GET /api/employee/machine-tasks
// @desc    Get all machine rentals assigned to machines owned by this employee
// @access  Private
router.get('/machine-tasks', protect, async (req, res) => {
    try {
        // Find all machines owned by this employee
        const myMachines = await Machine.find({ owner: req.user.id }).select('_id');
        const machineIds = myMachines.map(m => m._id);

        const rentals = await Rental.find({ machine: { $in: machineIds } })
            .populate('machine', 'name priceDay priceHour')
            .populate('buyer', 'name phone address profilePhotoUrl aadhaarNumber location')
            .sort({ createdAt: -1 });

        res.json(rentals);
    } catch (error) {
        console.error('Fetch employee machine tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch machine tasks' });
    }
});

// @route   PATCH /api/employee/machine-tasks/:id/status
// @desc    Update machine task (Rental) status
// @access  Private
router.patch('/machine-tasks/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        // Frontend: new -> accepted -> in-progress -> completed
        // Backend Rental: New | Accepted | Completed | Cancelled
        const statusMap = {
            'new': 'New',
            'accepted': 'Accepted',
            'in-progress': 'Accepted',
            'completed': 'Completed'
        };
        const dbStatus = statusMap[status];
        if (!dbStatus) return res.status(400).json({ error: 'Invalid status' });

        const rental = await Rental.findByIdAndUpdate(
            req.params.id,
            { status: dbStatus },
            { new: true }
        );
        if (!rental) return res.status(404).json({ error: 'Rental not found' });
        res.json({ message: 'Status updated', rental });
    } catch (error) {
        console.error('Update machine task status error:', error);
        res.status(500).json({ error: 'Failed to update machine task status' });
    }
});

// @route   GET /api/employee/soil-tasks
// @desc    Get all soil test requests assigned to this employee (as lab)
// @access  Private
router.get('/soil-tasks', protect, async (req, res) => {
    try {
        const requests = await SoilRequest.find({ lab: req.user.id })
            .populate('farmer', 'name phone address profilePhotoUrl aadhaarNumber location')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Fetch employee soil tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch soil tasks' });
    }
});

// @route   PATCH /api/employee/soil-tasks/:id/status
// @desc    Update soil task status
// @access  Private
router.patch('/soil-tasks/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        // Frontend status -> DB status mapping
        const statusMap = {
            'new': 'New',
            'sample-picked': 'Accepted',
            'sent-to-lab': 'InProgress',
            'reported': 'Completed'
        };
        const dbStatus = statusMap[status];
        if (!dbStatus) return res.status(400).json({ error: 'Invalid status' });

        const request = await SoilRequest.findOneAndUpdate(
            { _id: req.params.id, lab: req.user.id },
            { status: dbStatus },
            { new: true }
        );
        if (!request) return res.status(404).json({ error: 'Soil request not found' });
        res.json({ message: 'Status updated', request });
    } catch (error) {
        console.error('Update soil task status error:', error);
        res.status(500).json({ error: 'Failed to update soil task status' });
    }
});

// ============ DOCTOR CHAT ROUTES ============

// @route   GET /api/employee/doctor-chats
// @desc    Get all doctor chat rooms for this employee (doctor)
// @access  Private
router.get('/doctor-chats', protect, async (req, res) => {
    try {
        // Return all chats — blocked ones will show with Unblock option in UI
        const chats = await Chat.find({ doctor: req.user.id })
            .populate('farmer', 'name phone address profilePhotoUrl aadhaarNumber location')
            .sort({ lastTime: -1 });
        res.json(chats);
    } catch (e) {
        console.error('Fetch doctor chats error:', e);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// @route   GET /api/employee/doctor-chats/:id/messages
// @desc    Get all messages in a chat room
// @access  Private
router.get('/doctor-chats/:id/messages', protect, async (req, res) => {
    try {
        const msgs = await Message.find({ chat: req.params.id })
            .sort({ createdAt: 1 });
        // Mark as read by doctor
        await Chat.findByIdAndUpdate(req.params.id, { unreadByDoctor: 0 });
        res.json(msgs);
    } catch (e) {
        console.error('Fetch messages error:', e);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// @route   PATCH /api/employee/doctor-chats/:id/block
// @desc    Block or unblock a chat room
// @access  Private
router.patch('/doctor-chats/:id/block', protect, async (req, res) => {
    try {
        const { block } = req.body; // true = block, false = unblock
        const chat = await Chat.findOneAndUpdate(
            { _id: req.params.id, doctor: req.user.id },
            { isBlocked: !!block },
            { new: true }
        );
        if (!chat) return res.status(404).json({ error: 'Chat not found' });
        res.json({ message: block ? 'Farmer blocked' : 'Farmer unblocked', isBlocked: chat.isBlocked });
    } catch (e) {
        console.error('Block/unblock chat error:', e);
        res.status(500).json({ error: 'Failed to update block status' });
    }
});

// @route   GET /api/employee/doctor-chats/:id/block-status
// @desc    Get blocked status of a specific chat
// @access  Private
router.get('/doctor-chats/:id/block-status', protect, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, doctor: req.user.id }).select('isBlocked');
        if (!chat) return res.status(404).json({ error: 'Chat not found' });
        res.json({ isBlocked: chat.isBlocked });
    } catch (e) {
        res.status(500).json({ error: 'Failed to get block status' });
    }
});

// @route   POST /api/employee/doctor-chats/:id/messages
// @desc    Send a message in a chat room
// @access  Private
router.post('/doctor-chats/:id/messages', protect, async (req, res) => {
    try {
        const { text, mediaUrl, mediaType, audioDuration } = req.body;
        if (!text && !mediaUrl) return res.status(400).json({ error: 'Empty message' });

        const msg = new Message({
            chat: req.params.id,
            sender: req.user.id,
            text: (text || '').trim(),
            mediaUrl: mediaUrl || '',
            mediaType: mediaType || '',
            audioDuration: audioDuration || 0,
            fromDoctor: true
        });
        await msg.save();

        // Update chat's last message
        await Chat.findByIdAndUpdate(req.params.id, {
            lastMessage: text.trim(),
            lastTime: new Date()
        });

        res.json(msg);
    } catch (e) {
        console.error('Send message error:', e);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// @route   POST /api/employee/doctor-chats
// @desc    Create a new chat room (for testing / admin use)
// @access  Private
router.post('/doctor-chats', protect, async (req, res) => {
    try {
        const { farmerId, cropName } = req.body;
        // Check if chat already exists
        let chat = await Chat.findOne({ farmer: farmerId, doctor: req.user.id });
        if (!chat) {
            chat = new Chat({ farmer: farmerId, doctor: req.user.id, cropName: cropName || '' });
            await chat.save();
        }
        res.json(chat);
    } catch (e) {
        console.error('Create chat error:', e);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// @route   POST /api/employee/upload-chat-media
// @desc    Upload image or audio for chat
// @access  Private
router.post('/upload-chat-media', protect, uploadChatMedia.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const baseUrl = process.env.BASE_URL || `http://${req.hostname}:5500`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (e) {
        console.error('Chat media upload error:', e);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ============ ADMIN EMPLOYEE MANAGEMENT ROUTES ============

// @route   GET /api/employee/admin/all
// @desc    Get all employees for admin management
// @access  Private/Admin
router.get('/admin/all', protect, checkModule('labour'), async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).select('-password').sort({ createdAt: -1 });
        res.json(employees);
    } catch (e) {
        console.error('Admin fetch employees error:', e);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// @route   POST /api/employee/admin/create
// @desc    Create a new employee
// @access  Private/Admin
router.post('/admin/create', protect, checkModule('employees'), async (req, res) => {
    try {
        const { name, email, phone, address, employeeCode, password, employeeModules } = req.body;

        if (!name || !email || !password || !employeeCode) {
            return res.status(400).json({ error: 'Name, Email, Password and Employee Code are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }, { employeeCode }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email, phone or employee code already exists' });
        }

        const newUser = new User({
            name,
            email,
            phone,
            address,
            employeeCode,
            password, // Note: Should be hashed in production
            role: 'employee',
            status: 'approved',
            employeeModules: employeeModules || []
        });

        await newUser.save();
        res.status(201).json(newUser);
    } catch (e) {
        console.error('Admin create employee error:', e);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// @route   PATCH /api/employee/admin/:id
// @desc    Update employee details and access
// @access  Private/Admin
router.patch('/admin/:id', protect, checkModule('employees'), async (req, res) => {
    try {
        const updates = req.body;
        const employee = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'employee' },
            updates,
            { new: true }
        ).select('-password');

        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json(employee);
    } catch (e) {
        console.error('Admin update employee error:', e);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// @route   DELETE /api/employee/admin/:id
// @desc    Delete an employee
// @access  Private/Admin
router.delete('/admin/:id', protect, checkModule('employees'), async (req, res) => {
    try {
        const employee = await User.findOneAndDelete({ _id: req.params.id, role: 'employee' });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json({ message: 'Employee deleted successfully' });
    } catch (e) {
        console.error('Admin delete employee error:', e);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// @route   GET /api/employee/farmer-lookup
// @desc    Lookup farmer by cardNumber (16 digits) or phone (10 digits)
// @access  Private (Employee/Field Executive)
router.get('/farmer-lookup', protect, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: 'Search query is required' });

        const farmers = await User.find({
            $or: [
                { cardNumber: query },
                { phone: new RegExp(query) }
            ]
        }).select('name phone address walletBalance profilePhotoUrl cardNumber role');

        if (!farmers || farmers.length === 0) return res.status(404).json({ error: 'No user found' });

        // Map roles for cleaner display if needed, but let's return all and filter in next step
        res.json(farmers);
    } catch (error) {
        console.error('Farmer lookup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/employee/recharge-history
// @desc    Get recharge history for the logged in employee
// @access  Private (Employee/Field Executive)
router.get('/recharge-history', protect, async (req, res) => {
    try {
        const history = await Transaction.find({
            performedBy: req.user.id,
            module: 'Platform'
        })
        .populate('recipient', 'name phone profilePhotoUrl')
        .sort({ createdAt: -1 })
        .limit(30);

        res.json(history);
    } catch (error) {
        console.error('Recharge history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/employee/recharge-stats
// @desc    Get pending cash collection stats for the employee
// @access  Private (Employee/Field Executive)
router.get('/recharge-stats', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('collectedCash');
        res.json({ pendingAmount: user.collectedCash || 0 });
    } catch (error) {
        console.error('Recharge stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/employee/recharge-farmer
// @desc    Recharge farmer wallet via 11-digit cardNumber or 10-digit phone
// @access  Private (Field Executive or Admin or Employee)
router.post('/recharge-farmer', protect, async (req, res) => {
    try {
        const { cardNumber, phone, amount } = req.body;
        if ((!cardNumber && !phone) || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid card number or phone and amount are required' });
        }

        // Only allow field_executive, admin, or employee
        if (req.user.role !== 'field_executive' && req.user.role !== 'admin' && req.user.role !== 'employee') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const query = cardNumber ? { cardNumber } : { phone };
        const farmer = await User.findOne({ ...query, role: { $in: ['farmer', 'buyer'] } });
        
        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }

        // 1. Update Farmer Wallet
        farmer.walletBalance = (farmer.walletBalance || 0) + Number(amount);
        await farmer.save();

        // 2. Increment Employee Collection (if FE/Employee)
        if (req.user.role === 'field_executive' || req.user.role === 'employee') {
            await User.findByIdAndUpdate(req.user.id, { $inc: { collectedCash: Number(amount) } });
        }

        // 3. Create Transaction for Farmer
        const shortId = Date.now().toString().slice(-8).toUpperCase();
        const employeeName = req.user.name || 'Field Executive';
        
        await Transaction.create({
            transactionId: `RECH-${shortId}`,
            recipient: farmer._id,
            performedBy: req.user.id,
            module: 'Platform',
            amount: Number(amount),
            type: 'Credit',
            paymentMode: 'Cash',
            status: 'Completed',
            note: `Wallet Recharge by ${employeeName} (Partner App)`
        });

        // 4. Dynamic Auto-Repayment (If farmer has debt and wallet balance, sweep it)
        const { processAutoRepayment } = require('../services/repaymentService');
        await processAutoRepayment(farmer._id);

        // Fetch updated farmer for final balance in response
        const updatedFarmer = await User.findById(farmer._id);

        res.json({
            message: 'Recharge successful',
            newBalance: updatedFarmer.walletBalance,
            farmerName: updatedFarmer.name
        });
    } catch (error) {
        console.error('Recharge farmer error:', error);
        res.status(500).json({ error: 'Server error during recharge: ' + error.message });
    }
});

// @route   GET /api/employee/admin/recharge-logs
// @desc    Get all wallet recharges for admin tracking
// @access  Private/Admin
router.get('/admin/recharge-logs', protect, checkModule('labour'), async (req, res) => {
    try {
        const logs = await Transaction.find({
            module: 'Platform',
            type: 'Credit',
            paymentMode: 'Cash'
        })
            .populate('recipient', 'name phone cardNumber')
            .populate('performedBy', 'name role employeeCode')
            .sort({ createdAt: -1 });

        res.json(logs);
    } catch (error) {
        console.error('Get recharge logs error:', error);
        res.status(500).json({ error: 'Failed to fetch recharge logs' });
    }
});

// @route   PATCH /api/employee/admin/recharge-logs/:id/collect
// @desc    Mark a cash recharge as collected by admin
// @access  Private/Admin
router.patch('/admin/recharge-logs/:id/collect', protect, async (req, res) => {
    try {
        const log = await Transaction.findById(req.params.id);
        if (!log) return res.status(404).json({ error: 'Transaction log not found' });

        if (log.cashCollectedByAdmin) {
            return res.status(400).json({ error: 'This transaction is already marked as collected' });
        }

        // 1. Mark as collected
        log.cashCollectedByAdmin = true;
        await log.save();

        // 2. Deduct from Field Executive's balance
        if (log.performedBy) {
            const executive = await User.findById(log.performedBy);
            if (executive && (executive.role === 'field_executive' || executive.role === 'employee')) {
                // Decrement the collectedCash by the recharge amount
                const currentBalance = executive.collectedCash || 0;
                const newBalance = Math.max(0, currentBalance - (log.amount || 0));
                executive.collectedCash = newBalance;
                await executive.save();

                // 3. Create a DEBIT transaction for the Field Executive to show in their history
                await Transaction.create({
                    transactionId: `DEP-${Date.now().toString().slice(-8)}`,
                    recipient: log.recipient, // Current recipient of original recharge
                    performedBy: log.performedBy, // Executive
                    module: 'Platform',
                    amount: log.amount,
                    type: 'Debit',
                    payerName: 'Admin Office',
                    paymentMode: 'Cash',
                    status: 'Completed',
                    note: `Cash Collected by Admin (Individual Recharge Ref: ${log.transactionId})`
                });
            }
        }

        res.json({ message: 'Cash marked as collected and balance updated', log });
    } catch (error) {
        console.error('Mark collection error:', error);
        res.status(500).json({ error: 'Failed to mark collection' });
    }
});

// @route   PATCH /api/employee/admin/field-executive/:id/reset-collection
// @desc    Reset field executive's cash collection to 0 and mark all as collected
// @access  Private/Admin
router.patch('/admin/field-executive/:id/reset-collection', protect, checkModule('users'), async (req, res) => {
    try {
        const executiveId = req.params.id;
        const executive = await User.findById(executiveId);
        if (!executive) return res.status(404).json({ error: 'Executive not found' });

        const amountToClear = executive.collectedCash || 0;

        // 1. Reset collectedCash in User model
        executive.collectedCash = 0;
        await executive.save();

        // 2. Mark all pending cash transactions as collected
        await Transaction.updateMany(
            { performedBy: executiveId, module: 'Platform', type: 'Credit', cashCollectedByAdmin: false },
            { cashCollectedByAdmin: true }
        );

        // 3. Create a single DEBIT transaction for the Field Executive history
        if (amountToClear > 0) {
            await Transaction.create({
                transactionId: `DEP-FULL-${Date.now().toString().slice(-8)}`,
                performedBy: executiveId, // Executive
                module: 'Platform',
                amount: amountToClear,
                type: 'Debit',
                payerName: 'Admin Office',
                paymentMode: 'Cash',
                status: 'Completed',
                note: `Full Wallet Cash Deposit to Admin Office`
            });
        }

        res.json({ message: 'Collection reset successful and deposit recorded' });
    } catch (error) {
        console.error('Reset collection error:', error);
        res.status(500).json({ error: 'Failed to reset collection' });
    }
});

// =============================================
// ADMIN: FARMERS & USERS MANAGEMENT ROUTES
// =============================================

// @route   GET /api/employee/admin/farmers
// @desc    Get all farmers (role: 'buyer') with stats for admin management
// @access  Private/Admin
router.get('/admin/farmers', protect, checkModule('users'), async (req, res) => {
    try {
        const farmers = await User.find({ role: { $in: ['farmer', 'buyer'] } })
            .select('name phone email address status aadhaarNumber aadhaarDocUrl panNumber panDocUrl bankDetails walletBalance walletNumber cardNumber profilePhotoUrl creditLimit creditUsed createdAt')
            .sort({ createdAt: -1 });

        // Get stats per farmer concurrently
        const result = await Promise.all(farmers.map(async f => {
            const [orders, completed, sellReqs] = await Promise.all([
                Order.countDocuments({ buyer: f._id }),
                Order.countDocuments({ buyer: f._id, status: 'completed' }),
                SellRequest.countDocuments({ farmer: f._id })
            ]);

            return {
                _id: f._id,
                name: f.name,
                phone: f.phone,
                email: f.email || '',
                location: f.address || 'N/A',
                status: f.status || 'pending',
                aadhaarNumber: f.aadhaarNumber || '',
                aadhaarDocUrl: f.aadhaarDocUrl || '',
                panNumber: f.panNumber || '',
                panDocUrl: f.panDocUrl || '',
                bankDetails: f.bankDetails || {},
                profilePhotoUrl: f.profilePhotoUrl || '',
                kycStatus: (f.aadhaarNumber || f.panNumber) ? 'verified' : 'pending',
                walletBalance: f.walletBalance || 0,
                walletNumber: f.walletNumber || '',
                cardNumber: f.cardNumber || '',
                creditLimit: f.creditLimit || 0,
                creditUsed: f.creditUsed || 0,
                totalOrders: orders + sellReqs,
                completedOrders: completed,
                joinedAt: f.createdAt
            };
        }));

        res.json(result);
    } catch (e) {
        console.error('Admin farmers error:', e);
        res.status(500).json({ error: 'Failed to fetch farmers' });
    }
});

// @route   POST /api/employee/admin/generate-card/:userId
// @desc    Generate a random 11-digit card number for a user
// @access  Private/Admin
router.post('/admin/generate-card/:userId', protect, checkModule('users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.status !== 'approved') {
            return res.status(400).json({ error: 'User must be approved before generating a card' });
        }

        // if (user.cardNumber) {
        //     return res.status(400).json({ error: 'Card number already generated' });
        // }

        // Use manual value from body or generate random 16-digit
        let cardNumber = req.body.cardNumber;
        
        if (!cardNumber) {
            cardNumber = '';
            for (let i = 0; i < 16; i++) {
                cardNumber += Math.floor(Math.random() * 10);
            }
        }

        user.cardNumber = cardNumber;
        await user.save();

        res.json({ message: 'Card number generated successfully', cardNumber });
    } catch (e) {
        console.error('Admin generate card error:', e);
        res.status(500).json({ error: 'Failed to generate card number' });
    }
});

// @route   GET /api/employee/admin/farmers/stats
// @desc    Get KPI stats for farmers dashboard
// @access  Private/Admin
router.get('/admin/farmers/stats', protect, checkModule('users'), async (req, res) => {
    try {
        const totalFarmers = await User.countDocuments({ role: 'buyer' });
        const activeFarmers = await User.countDocuments({ role: 'buyer', status: 'approved' });
        const pendingFarmers = await User.countDocuments({ role: 'buyer', status: 'pending' });
        const kycVerified = await User.countDocuments({ role: 'buyer', aadhaarNumber: { $exists: true, $ne: '' } });

        // Count pending from both models
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const pendingSellReqs = await SellRequest.countDocuments({ status: 'pending' });
        const newRequests = pendingOrders + pendingSellReqs;

        const assignedOrders = await Order.countDocuments({ status: { $in: ['accepted', 'in-progress'] } });
        const assignedSellReqs = await SellRequest.countDocuments({ status: 'accepted' });
        const assigned = assignedOrders + assignedSellReqs;

        const completedOrders = await Order.countDocuments({ status: 'completed' });
        const completedSellReqs = await SellRequest.countDocuments({ status: 'completed' });
        const completed = completedOrders + completedSellReqs;

        res.json({ totalFarmers, activeFarmers, pendingFarmers, kycVerified, newRequests, assigned, completed });
    } catch (e) {
        console.error('Farmers stats error:', e);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// =============================================
// ADMIN: SOIL TESTING LAB MANAGEMENT ROUTES
// =============================================

// @route   GET /api/employee/admin/soil-labs/stats
// @desc    Get KPI stats for Soil Labs dashboard (Admin)
// @access  Private/Admin
router.get('/admin/soil-labs/stats', protect, checkModule('soil'), async (req, res) => {
    try {
        const totalLabs = await User.countDocuments({ role: 'soil' });
        const activeLabs = await User.countDocuments({ role: 'soil', status: 'approved' });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const allRequests = await SoilRequest.find({});

        const totalTests = allRequests.length;
        const thisMonthTests = allRequests.filter(r => r.createdAt >= startOfMonth).length;
        const totalRevenue = allRequests.reduce((sum, req) => sum + (req.price || 0), 0);
        const thisMonthRevenue = allRequests
            .filter(r => r.createdAt >= startOfMonth)
            .reduce((sum, req) => sum + (req.price || 0), 0);

        const npkTests = allRequests.filter(r => r.testType === 'NPK');
        const phTests = allRequests.filter(r => r.testType === 'pH');
        const microTests = allRequests.filter(r => r.testType === 'Micro Nutrients');

        const activeLabsList = await User.find({ role: 'soil', status: 'approved' });

        const calcAvgPrice = (arr) => arr.length > 0 ? (arr.reduce((s, r) => s + (r.price || 0), 0) / arr.length).toFixed(0) : 0;
        const calcAvgTAT = (testName) => {
            const labsWithTest = activeLabsList.filter(lab => lab.soilDetails && lab.soilDetails.testTypes && lab.soilDetails.testTypes.includes(testName));
            if (labsWithTest.length === 0) return 3; // default
            return Number((labsWithTest.reduce((s, lab) => s + (lab.soilDetails.tatDays || 3), 0) / labsWithTest.length).toFixed(1));
        };

        res.json({
            totalLabs,
            activeLabs,
            totalTests,
            thisMonthTests,
            totalRevenue,
            thisMonthRevenue,
            activeRate: totalLabs > 0 ? ((activeLabs / totalLabs) * 100).toFixed(1) : 0,
            testTypes: {
                npk: { tests: npkTests.length, avgPrice: calcAvgPrice(npkTests), avgTAT: calcAvgTAT('NPK') },
                ph: { tests: phTests.length, avgPrice: calcAvgPrice(phTests), avgTAT: calcAvgTAT('pH') },
                microNutrients: { tests: microTests.length, avgPrice: calcAvgPrice(microTests), avgTAT: calcAvgTAT('Micro Nutrients') }
            }
        });
    } catch (e) {
        console.error('Admin soil labs stats error:', e);
        res.status(500).json({ error: 'Failed to fetch soil lab stats' });
    }
});

// @route   GET /api/employee/admin/soil-labs
// @desc    Get all active soil labs with their stats
// @access  Private/Admin
router.get('/admin/soil-labs', protect, checkModule('soil'), async (req, res) => {
    try {
        const labs = await User.find({ role: 'soil' })
            .select('name businessName phone email address status employeeCode soilDetails createdAt aadhaarDocUrl businessLicenseUrl bankDetails')
            .sort({ createdAt: -1 });

        const result = await Promise.all(labs.map(async lab => {
            const completedTests = await SoilRequest.countDocuments({ lab: lab._id, status: 'Completed' });

            return {
                _id: lab._id,
                labName: lab.businessName || lab.name,
                labCode: lab.employeeCode || lab._id.toString().substring(18),
                phone: lab.phone,
                email: lab.email || '',
                location: lab.address,
                status: lab.status,
                testTypes: (lab.soilDetails && lab.soilDetails.testTypes) ? lab.soilDetails.testTypes : [],
                tatDays: (lab.soilDetails && lab.soilDetails.tatDays) ? lab.soilDetails.tatDays : 3,
                testsDone: completedTests,
                documentUrl: lab.aadhaarDocUrl || '',
                businessLicenseUrl: lab.businessLicenseUrl || '',
                bankDetails: lab.bankDetails || {},
                joinedAt: lab.createdAt
            };
        }));

        res.json(result);
    } catch (e) {
        console.error('Admin soil labs error:', e);
        res.status(500).json({ error: 'Failed to fetch soil labs' });
    }
});

// @route   GET /api/employee/admin/users/:id
// @desc    Get full user profile for admin (bank details, docs etc)
// @access  Private/Admin
router.get('/admin/users/:id', protect, checkModule('soil'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        console.error('Admin get user error:', e);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// @route   PUT /api/employee/admin/users/:id/bank-details
// @desc    Admin: Update user bank details
// @access  Private/Admin
router.put('/admin/users/:id/bank-details', protect, checkModule('soil'), async (req, res) => {
    try {
        const { holderName, bankName, accountNumber, ifscCode, bankAddress } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const b = user.bankDetails || {};
        user.bankDetails = {
            holderName: holderName !== undefined ? holderName : b.holderName || '',
            bankName: bankName !== undefined ? bankName : b.bankName || '',
            accountNumber: accountNumber !== undefined ? accountNumber : b.accountNumber || '',
            ifscCode: ifscCode !== undefined ? ifscCode : b.ifscCode || '',
            bankAddress: bankAddress !== undefined ? bankAddress : b.bankAddress || '',
            bankDocUrl: b.bankDocUrl || ''
        };

        user.markModified('bankDetails');
        await user.save();
        res.json({ message: 'Bank details updated by admin', bankDetails: user.bankDetails });
    } catch (e) {
        console.error('Admin update bank details error:', e);
        res.status(500).json({ error: 'Failed to update bank details' });
    }
});

// @route   GET /api/employee/admin/soil-requests
// @desc    Get all soil test requests (orders) for admin
// @access  Private/Admin
router.get('/admin/soil-requests', protect, checkModule('soil'), async (req, res) => {
    try {
        const requests = await SoilRequest.find({})
            .populate('farmer', 'name phone address')
            .populate('lab', 'name businessName phone address')
            .sort({ createdAt: -1 })
            .limit(100);

        const result = requests.map(r => ({
            _id: r._id,
            farmerName: r.farmer ? r.farmer.name : 'Unknown',
            farmerPhone: r.farmer ? r.farmer.phone : '',
            labName: r.lab ? (r.lab.businessName || r.lab.name) : 'Unknown',
            testType: r.testType,
            price: r.price,
            paymentMethod: r.paymentMethod || 'cash',
            paymentStatus: r.paymentStatus || 'Pending',
            status: r.status,
            createdAt: r.createdAt,
            state: r.state || '',
            district: r.district || '',
            village: r.village || '',
            sampleLocation: r.village ? `${r.village}, ${r.district}, ${r.state}` : (r.farmer ? r.farmer.address : 'N/A'),
            cropName: r.cropName || 'N/A',
            sampleType: r.sampleType || 'Field Soil',
            visitType: r.visitType || 'I will visit lab',
            reportUrl: r.reportUrl || '',
            advisoryText: r.advisoryText || ''
        }));

        res.json(result);
    } catch (e) {
        console.error('Admin soil requests error:', e);
        res.status(500).json({ error: 'Failed to fetch soil requests' });
    }
});

// @route   PUT /api/employee/admin/soil-requests/:id/assign
// @desc    Assign a lab partner to a soil test request
// @access  Private/Admin
router.put('/admin/soil-requests/:id/assign', protect, checkModule('soil'), async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ error: 'labId is required' });

        const lab = await User.findById(labId);
        if (!lab || lab.role !== 'soil') {
            return res.status(404).json({ error: 'Lab partner not found' });
        }

        const request = await SoilRequest.findByIdAndUpdate(
            req.params.id,
            { lab: labId, status: 'New' },
            { new: true }
        ).populate('farmer', 'name');

        if (!request) return res.status(404).json({ error: 'Soil request not found' });

        // Send notification to lab partner
        try {
            const { sendNotification } = require('../services/notificationService');
            await sendNotification(labId, {
                title: 'New Soil Test Assigned',
                messageEn: `A new soil test request from ${request.farmer ? request.farmer.name : 'a farmer'} has been assigned to you.`,
                messageHi: `एक नया मिट्टी परीक्षण अनुरोध ${request.farmer ? request.farmer.name : 'एक किसान'} से आपको सौंपा गया है।`,
                type: 'soil_test',
                refId: request._id.toString()
            });

            // Send notification to farmer
            if (request.farmer) {
                const notifMsgEn = `Your soil test request has been assigned to a lab partner.`;
                const notifMsgHi = `आपके मिट्टी परीक्षण अनुरोध को एक लैब पार्टनर को सौंपा गया है।`;
                await sendNotification(request.farmer, {
                    title: 'Soil Test Update',
                    messageEn: notifMsgEn,
                    messageHi: notifMsgHi,
                    type: 'soil_test',
                    refId: request._id.toString()
                }).catch(() => {}); // Catch notification errors to not block main flow
            }
        } catch (notifError) {
            console.error('Notification error (ignoring):', notifError);
        }

        res.json({ message: 'Lab assigned successfully', request });
    } catch (error) {
        console.error('Assign lab error:', error);
        res.status(500).json({ error: 'Failed to assign lab' });
    }
});

// =============================================
// ADMIN: CROP SELL REQUESTS MANAGEMENT ROUTES
// =============================================

// @route   GET /api/employee/admin/crop-requests
// @desc    Get all crop sell requests (orders) for admin
// @access  Private/Admin
router.get('/admin/crop-requests', protect, checkModule('doctor'), async (req, res) => {
    try {
        const [orders, sellRequests] = await Promise.all([
            Order.find({})
                .populate('buyer', 'name phone address')
                .populate('assignedTo', 'name phone businessName')
                .sort({ createdAt: -1 })
                .lean(),
            SellRequest.find({ status: 'pending' }) // Only pending sell requests
                .populate('farmer', 'name phone address')
                .populate('mandi', 'name')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        const orderResult = orders.map(o => ({
            _id: o._id,
            farmerName: o.farmerName || (o.buyer && o.buyer.name) || 'Unknown',
            farmerPhone: o.farmerMobile || (o.buyer && o.buyer.phone) || '',
            location: o.village ? `${o.village}, ${o.district}` : (o.location || 'N/A'),
            crop: o.crop,
            quantity: o.quantity,
            variety: o.variety || '',
            pricePerQuintal: o.pricePerQuintal || 0,
            status: o.status,
            imageUrl: o.imageUrl || '',
            images: o.imageUrl ? [o.imageUrl] : [],
            note: o.note || '',
            assignedBuyer: o.assignedTo ? { name: o.assignedTo.name || o.assignedTo.businessName, phone: o.assignedTo.phone } : null,
            buyerId: o.assignedTo ? o.assignedTo._id : null,
            farmerId: (o.buyer && o.buyer._id) ? o.buyer._id : null,
            createdAt: o.createdAt,
            source: 'order'
        }));

        const sellResult = sellRequests.map(s => ({
            _id: s._id,
            farmerName: s.farmer ? s.farmer.name : 'Unknown',
            farmerPhone: s.farmer ? s.farmer.phone : '',
            location: s.mandi ? s.mandi.name : (s.farmer ? s.farmer.address : 'N/A'),
            crop: s.cropName,
            quantity: s.quantity,
            variety: s.variety || '',
            pricePerQuintal: parsePriceInQuintals(s.expectedPrice),
            status: s.status,
            imageUrl: (s.images && s.images.length > 0) ? s.images[0] : '',
            images: s.images || [],
            note: s.notes || '',
            assignedBuyer: null,
            buyerId: null,
            farmerId: s.farmer ? s.farmer._id : null,
            createdAt: s.createdAt,
            source: 'sell-request'
        }));

        // Combine and sort by date
        const combined = [...orderResult, ...sellResult].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(combined);
    } catch (e) {
        console.error('Crop requests error:', e);
        res.status(500).json({ error: 'Failed to fetch crop requests' });
    }
});

// @route   GET /api/employee/admin/buyer-partners
// @desc    Get all buyer partners (role: 'buyer') for assignment dropdown
// @access  Private/Admin  
router.get('/admin/buyer-partners', protect, checkModule('doctor'), async (req, res) => {
    try {
        // Note: In this system, buyer partners have role 'buyer' and are approved
        // They are different from farmer-buyers; we use them to match crop sell requests
        const buyers = await User.find({ role: 'buyer', status: 'approved' })
            .select('name phone businessName address')
            .sort({ name: 1 });

        res.json(buyers.map(b => ({
            _id: b._id,
            name: b.businessName || b.name,
            phone: b.phone,
            location: b.address || 'N/A'
        })));
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch buyers' });
    }
});

// @route   PUT /api/employee/admin/crop-requests/:id/assign
// @desc    Assign a crop request to a buyer partner
// @access  Private/Admin
router.put('/admin/crop-requests/:id/assign', protect, checkModule('doctor'), async (req, res) => {
    try {
        const { buyerId } = req.body;
        if (!buyerId) return res.status(400).json({ error: 'buyerId is required' });

        // 1. Try finding as an existing Order first (Re-assignment)
        let order = await Order.findById(req.params.id).populate('sellRequestId');
        if (order) {
            order.assignedTo = buyerId;
            order.status = 'accepted'; 
            order.assignedStatus = 'new'; // Reset so the new buyer sees it in Pending
            order.cancelReason = ''; // Clear any previous cancel reason
            await order.save();
            
            // Send immediate notification to farmer on re-assignment
            try {
                if (order.sellRequestId) {
                    const sReq = order.sellRequestId;
                    const farmer = await User.findById(sReq.farmer);
                    if (farmer && sReq.otp) {
                        const buyer = await User.findById(buyerId);
                        const bName = buyer ? (buyer.businessName || buyer.name) : 'A trader';
                        const msgEn = `OTP: ${sReq.otp} - ORDER: #${order._id.toString().slice(-6)} - Trader ${bName} has been assigned for your sell request (${order.crop}).`;
                        const msgHi = `OTP: ${sReq.otp} - ऑर्डर: #${order._id.toString().slice(-6)} - आपके ${order.crop} के बेचने के अनुरोध के लिए व्यापारी ${bName} को नियुक्त किया गया है।`;
                        
                        const { sendNotification: sNotif } = require('../services/notificationService');
                        const { sendOtp: sOtp } = require('../services/msg91');

                        console.log(`[ORDER-ASSIGN-DEBUG] Sending Re-assign OTP to farmer ${farmer._id}`);
                        await sNotif(farmer._id, { 
                            title: `Order #${order._id.toString().slice(-6)} (OTP: ${sReq.otp})`, 
                            messageEn: msgEn, 
                            messageHi: msgHi, 
                            type: 'crop_sale', 
                            refId: order._id.toString() 
                        });
                        if (farmer.phone) await sOtp(farmer.phone.replace(/[^0-9]/g, ''), sReq.otp).catch(err => console.error('[ORDER-ASSIGN-DEBUG] SMS Error:', err.message));
                    }
                }
            } catch (err) { console.error('[ORDER-ASSIGN-DEBUG] Notification error during re-assignment:', err); }

            const populated = await Order.findById(order._id).populate('assignedTo', 'name phone businessName');
            return res.json({ message: 'Buyer reassigned successfully', order: populated });
        }

        // 2. If not an Order, check if it's a SellRequest (initial assignment)
        const sellReq = await SellRequest.findById(req.params.id).populate('farmer').populate('mandi');
        if (sellReq) {
            const { newPrice, buyerId: bodyBuyerId } = req.body;
            const buyer = await User.findById(buyerId || bodyBuyerId);
            if (!buyer) return res.status(404).json({ error: 'Buyer not found' });

            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const finalPrice = newPrice || parsePriceInQuintals(sellReq.expectedPrice);

            const settings = await Settings.getSettings();
            const bCommissionRate = sellReq.commissionRate || settings.commissions.buyerTrading || 0;
            const qty = parseQuantityInQuintals(sellReq.quantity);
            const cropPrice = qty * finalPrice;
            const commissionAmount = (cropPrice * bCommissionRate) / 100;

            const newOrder = new Order({
                buyer: buyerId,
                assignedTo: buyerId,
                farmerName: sellReq.farmer ? sellReq.farmer.name : 'Unknown',
                farmerMobile: sellReq.farmer ? sellReq.farmer.phone : '',
                village: sellReq.farmer ? (sellReq.farmer.address || 'N/A') : 'N/A',
                district: '',
                state: '',
                location: sellReq.mandi ? sellReq.mandi.name : (sellReq.farmer ? (sellReq.farmer.address || 'N/A') : 'N/A'),
                crop: sellReq.cropName,
                quantity: sellReq.quantity,
                variety: sellReq.variety || '',
                pricePerQuintal: finalPrice,
                pricePerKg: finalPrice / 100,
                amount: cropPrice,
                commission: commissionAmount,
                commissionRate: bCommissionRate,
                imageUrl: (sellReq.images && sellReq.images.length > 0) ? sellReq.images[0] : '',
                note: sellReq.notes || '',
                status: 'accepted',
                assignedStatus: 'new',
                sellRequestId: sellReq._id
            });
            await newOrder.save();

            sellReq.status = 'accepted';
            sellReq.assignedTo = buyerId;
            sellReq.otp = otp;
            sellReq.adminPrice = finalPrice;
            await sellReq.save();

            // Send immediate notification to farmer on initial assignment
            try {
                if (sellReq.farmer) {
                    const bName = buyer ? (buyer.businessName || buyer.name) : 'A trader';
                    const msgEn = `OTP: ${otp} - ORDER: #${newOrder._id.toString().slice(-6)} - Trader ${bName} has been assigned for your sell request (${sellReq.cropName}).`;
                    const msgHi = `OTP: ${otp} - ऑर्डर: #${newOrder._id.toString().slice(-6)} - आपके ${sellReq.cropName} के बेचने के अनुरोध के लिए व्यापारी ${bName} को नियुक्त किया गया है।`;
                    
                    const { sendNotification: sNotif } = require('../services/notificationService');
                    const { sendOtp: sOtp } = require('../services/msg91');

                    console.log(`[ORDER-ASSIGN-DEBUG] Sending Initial-Assign OTP to farmer ${sellReq.farmer._id}`);
                    await sNotif(sellReq.farmer._id, { 
                        title: `Order #${newOrder._id.toString().slice(-6)} (OTP: ${otp})`, 
                        messageEn: msgEn, 
                        messageHi: msgHi, 
                        type: 'crop_sale', 
                        refId: newOrder._id.toString() 
                    });
                    if (sellReq.farmer.phone) await sOtp(sellReq.farmer.phone.replace(/[^0-9]/g, ''), otp).catch(err => console.error('[ORDER-ASSIGN-DEBUG] SMS Error:', err.message));
                }
            } catch (err) { console.error('[ORDER-ASSIGN-DEBUG] Notification error during assignment:', err); }

            const populated = await Order.findById(newOrder._id).populate('assignedTo', 'name phone businessName');
            return res.json({ message: 'Buyer assigned and Order created', order: populated });
        }

        return res.status(404).json({ error: 'Request not found' });
    } catch (e) {
        console.error('Assign error:', e);
        res.status(500).json({ error: 'Failed to assign buyer' });
    }
});

// @route   PUT /api/employee/admin/crop-requests/:id/update-price
// @desc    Update only the price of a crop request or order
// @access  Private/Admin
router.put('/admin/crop-requests/:id/update-price', protect, checkModule('doctor'), async (req, res) => {
    try {
        const { newPrice } = req.body;
        if (newPrice === undefined || newPrice === null) {
            return res.status(400).json({ error: 'newPrice is required' });
        }

        const finalPrice = parseFloat(newPrice);
        if (isNaN(finalPrice)) return res.status(400).json({ error: 'Invalid price' });

        // 1. Try finding as an Order first
        let order = await Order.findById(req.params.id);
        if (order) {
            order.pricePerQuintal = finalPrice;
            order.pricePerKg = finalPrice / 100;
            
            // Recalculate amount and commission
            const qty = parseQuantityInQuintals(order.quantity);
            order.amount = qty * finalPrice;
            
            // Use commission rate from order or settings
            let bCommissionRate = order.commissionRate;
            if (bCommissionRate === undefined || bCommissionRate === null) {
                const settings = await Settings.getSettings();
                bCommissionRate = settings.commissions.buyerTrading || 0;
            }
            order.commission = (order.amount * bCommissionRate) / 100;
            
            await order.save();
            return res.json({ message: 'Price updated and totals recalculated', order });
        }

        // 2. If not an Order, check SellRequest
        const sellReq = await SellRequest.findById(req.params.id);
        if (sellReq) {
            sellReq.adminPrice = finalPrice;
            await sellReq.save();
            return res.json({ message: 'SellRequest price updated', sellRequest: sellReq });
        }

        return res.status(404).json({ error: 'Request/Order not found' });
    } catch (e) {
        console.error('Update price error:', e);
        res.status(500).json({ error: 'Failed to update price' });
    }
});

// @route   PUT /api/employee/admin/block/:id
// @desc    Block a user
// @access  Private/Admin
router.put('/admin/block/:id', protect, checkAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: `${user.name} blocked successfully` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to block user' });
    }
});

// @route   PUT /api/employee/admin/unblock/:id
// @desc    Unblock a user (set back to approved)
// @access  Private/Admin
router.put('/admin/unblock/:id', protect, checkModule('buyer'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: `${user.name} unblocked successfully` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

// @route   PUT /api/employee/admin/approve/:id
// @desc    Approve a pending user
// @access  Private/Admin
router.put('/admin/approve/:id', protect, checkModule('buyer'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: `${user.name} approved successfully` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to approve user' });
    }
});


// =====================================================================
// BUYER TRADING (B2B) - ADMIN ROUTES
// =====================================================================

// @route   GET /api/employee/admin/buyer/stats
// @desc    KPI cards: total buyers, active buyers, total orders, outstanding
// @access  Private/Admin
router.get('/admin/buyer/stats', protect, checkModule('buyer'), async (req, res) => {
    try {
        const totalBuyers = await User.countDocuments({ role: 'buyer' });
        const activeBuyers = await User.countDocuments({ role: 'buyer', status: 'approved' });
        const pendingBuyers = await User.countDocuments({ role: 'buyer', status: 'pending' });

        const allOrders = await Order.find({});
        const totalOrders = allOrders.length;

        // Outstanding = total amount of orders that are NOT completed
        const pendingOrders = allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
        const outstandingAmount = pendingOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

        // This month's orders
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthlyOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfMonth).length;

        res.json({
            totalBuyers,
            activeBuyers,
            pendingBuyers,
            totalOrders,
            outstandingAmount,
            monthlyOrders
        });
    } catch (e) {
        console.error('Buyer stats error:', e);
        res.status(500).json({ error: 'Failed to fetch buyer stats' });
    }
});

// @route   GET /api/employee/admin/buyers
// @desc    All buyer profiles with their order stats
// @access  Private/Admin
router.get('/admin/buyers', protect, checkModule('buyer'), async (req, res) => {
    try {
        const buyers = await User.find({ role: { $in: ['buyer', 'crop-buyer'] } }).sort({ createdAt: -1 });

        const enriched = await Promise.all(buyers.map(async (b) => {
            const orders = await Order.find({ buyer: b._id });
            const totalPurchaseQty = orders.reduce((sum, o) => {
                const qty = parseFloat(o.quantity) || 0;
                return sum + qty;
            }, 0);
            const totalValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
            const outstanding = orders
                .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
                .reduce((sum, o) => sum + (o.amount || 0), 0);

            return {
                _id: b._id,
                name: b.name,
                businessName: b.businessName || b.name,
                phone: b.phone,
                email: b.email || '',
                address: b.address,
                status: b.status,
                aadhaarDocUrl: b.aadhaarDocUrl || '',
                joinedAt: b.createdAt,
                totalOrders: orders.length,
                totalPurchaseQty: Math.round(totalPurchaseQty),
                totalValue,
                outstandingAmount: outstanding,
                bankDetails: {
                    holderName: b.bankDetails?.holderName || '',
                    bankName: b.bankDetails?.bankName || '',
                    accountNumber: b.bankDetails?.accountNumber || '',
                    ifscCode: b.bankDetails?.ifscCode || '',
                    bankAddress: b.bankDetails?.bankAddress || '',
                    bankDocUrl: b.bankDetails?.bankDocUrl || ''
                }
            };
        }));

        res.json(enriched);
    } catch (e) {
        console.error('Buyers list error:', e);
        res.status(500).json({ error: 'Failed to fetch buyers' });
    }
});

// @route   GET /api/employee/admin/buyer/requests
// @desc    All pending buyer purchase requests (orders with status pending)
// @access  Private/Admin
router.get('/admin/buyer/requests', protect, checkModule('buyer'), async (req, res) => {
    try {
        const requests = await Order.find({ status: 'pending' })
            .populate('buyer', 'name phone businessName address')
            .sort({ createdAt: -1 })
            .limit(50);

        const enriched = requests.map(r => ({
            _id: r._id,
            buyerName: r.buyer?.businessName || r.buyer?.name || 'Unknown',
            buyerPhone: r.buyer?.phone || '',
            buyerLocation: r.buyer?.address || r.location,
            crop: r.crop,
            quantity: r.quantity,
            variety: r.variety || '',
            pricePerQuintal: r.pricePerQuintal || 0,
            status: r.status,
            note: r.note || '',
            createdAt: r.createdAt,
            assignedTo: r.assignedTo || null,
            farmerName: r.farmerName || '',
            farmerMobile: r.farmerMobile || ''
        }));

        res.json(enriched);
    } catch (e) {
        console.error('Buyer requests error:', e);
        res.status(500).json({ error: 'Failed to fetch buyer requests' });
    }
});

// @route   GET /api/employee/admin/buyer/reconciliation
// @desc    Payment reconciliation: all non-pending orders for admin review
// @access  Private/Admin
router.get('/admin/buyer/reconciliation', protect, checkModule('buyer'), async (req, res) => {
    try {
        const orders = await Order.find({ status: { $in: ['accepted', 'in-progress', 'completed'] } })
            .populate('buyer', 'name phone businessName address')
            .sort({ createdAt: -1 })
            .limit(100);

        const settings = await Settings.getSettings();
        const commissionRate = settings.commissions.buyerTrading || 0;

        const enriched = orders.map(o => {
            const qty = parseQuantityInQuintals(o.quantity);
            const cropPrice = qty * (o.pricePerQuintal || 0);
            const commission = o.commission || (cropPrice * commissionRate / 100);
            const totalPayable = cropPrice + commission;
            const amountReceived = o.amountReceived || 0;
            const pendingAmount = Math.max(0, totalPayable - amountReceived);
            const farmerPayout = o.farmerAmount || 0;

            let settlement = o.settlement || 'pending';
            // Auto-derive if not explicitly set
            if (!o.settlement || o.settlement === 'pending') {
                if (o.status === 'completed' && totalPayable > 0 && amountReceived >= totalPayable) settlement = 'settled';
                else if (o.status === 'in-progress' || amountReceived > 0) settlement = 'in-progress';
            }

            return {
                _id: o._id,
                orderId: `#ORD-${o._id.toString().slice(-6).toUpperCase()}`,
                buyerName: o.buyer?.businessName || o.buyer?.name || 'Unknown',
                buyerPhone: o.buyer?.phone || '',
                buyerLocation: o.buyer?.address || '',
                crop: o.crop,
                quantity: o.quantity,
                totalPayable,
                amountReceived,
                pendingAmount,
                farmerPayout,
                settlement,
                status: o.status,
                farmerName: o.farmerName || '',
                farmerMobile: o.farmerMobile || '',
                createdAt: o.createdAt
            };
        });

        res.json(enriched);
    } catch (e) {
        console.error('Reconciliation error:', e);
        res.status(500).json({ error: 'Failed to fetch reconciliation data' });
    }
});

// @route   PUT /api/employee/admin/buyer/assign-farmer/:orderId
// @desc    Admin assigns a farmer to a buyer's pending order
// @access  Private/Admin
router.put('/admin/buyer/assign-farmer/:orderId', protect, checkModule('buyer'), async (req, res) => {
    try {
        const { farmerName, farmerMobile, village, district, state, pricePerQuintal, amount } = req.body;
        if (!farmerName) return res.status(400).json({ error: 'Farmer name is required' });

        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { farmerName, farmerMobile: farmerMobile || '', village: village || '', district: district || '', state: state || '', pricePerQuintal: pricePerQuintal || 0, farmerAmount: amount || 0, status: 'accepted' },
            { new: true }
        ).populate('buyer', 'name phone businessName');

        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Farmer assigned successfully', order });
    } catch (e) {
        console.error('Assign farmer error:', e);
        res.status(500).json({ error: 'Failed to assign farmer' });
    }
});

// @route   PUT /api/employee/admin/buyer/approve/:buyerId
// @desc    Approve a buyer (set status to approved)
// @access  Private/Admin
router.put('/admin/buyer/approve/:buyerId', protect, checkAdmin, async (req, res) => {
    try {
        const buyer = await User.findOneAndUpdate(
            { _id: req.params.buyerId, role: 'buyer' },
            { status: 'approved' },
            { new: true }
        );
        if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
        res.json({ message: `${buyer.businessName || buyer.name} approved`, buyer });
    } catch (e) {
        res.status(500).json({ error: 'Failed to approve buyer' });
    }
});

// @route   PUT /api/employee/admin/buyer/update/:buyerId
// @desc    Admin can update ANY field of a buyer (bypassing restriction)
router.put('/admin/buyer/update/:buyerId', protect, checkAdmin, async (req, res) => {
    try {
        const buyer = await User.findById(req.params.buyerId);
        if (!buyer) return res.status(404).json({ error: 'Buyer not found' });

        // Update fields if provided
        if (req.body.name) buyer.name = req.body.name;
        if (req.body.email) buyer.email = req.body.email;
        if (req.body.phone) buyer.phone = req.body.phone;
        if (req.body.address) buyer.address = req.body.address;
        if (req.body.businessName) buyer.businessName = req.body.businessName;
        if (req.body.aadhaarNumber) buyer.aadhaarNumber = req.body.aadhaarNumber;

        // Update Bank Details
        if (req.body.bankDetails) {
            const b = req.body.bankDetails;
            buyer.bankDetails = {
                holderName: b.holderName || (buyer.bankDetails ? buyer.bankDetails.holderName : ''),
                bankName: b.bankName || (buyer.bankDetails ? buyer.bankDetails.bankName : ''),
                accountNumber: b.accountNumber || (buyer.bankDetails ? buyer.bankDetails.accountNumber : ''),
                ifscCode: b.ifscCode || (buyer.bankDetails ? buyer.bankDetails.ifscCode : ''),
                bankAddress: b.bankAddress || (buyer.bankDetails ? buyer.bankDetails.bankAddress : ''),
                bankDocUrl: buyer.bankDetails ? buyer.bankDetails.bankDocUrl : ''
            };
        }

        await buyer.save();
        res.json({ message: 'Buyer profile updated successfully by Admin', buyer: {
            ...buyer.toObject(),
            bankDetails: {
                holderName: buyer.bankDetails?.holderName || '',
                bankName: buyer.bankDetails?.bankName || '',
                accountNumber: buyer.bankDetails?.accountNumber || '',
                ifscCode: buyer.bankDetails?.ifscCode || '',
                bankAddress: buyer.bankDetails?.bankAddress || '',
                bankDocUrl: buyer.bankDetails?.bankDocUrl || ''
            }
        }});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   PUT /api/employee/admin/buyer/reject/:buyerId
// @desc    Reject/suspend a buyer
// @access  Private/Admin
router.put('/admin/buyer/reject/:buyerId', protect, checkAdmin, async (req, res) => {
    try {
        const buyer = await User.findOneAndUpdate(
            { _id: req.params.buyerId, role: 'buyer' },
            { status: 'rejected' },
            { new: true }
        );
        if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
        res.json({ message: `${buyer.businessName || buyer.name} rejected`, buyer });
    } catch (e) {
        res.status(500).json({ error: 'Failed to reject buyer' });
    }
});

// @route   PUT /api/employee/admin/buyer/order-status/:orderId
// @desc    Update order status (accepted ? in-progress ? completed / cancelled)
// @access  Private/Admin
router.put('/admin/buyer/order-status/:orderId', protect, checkAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['accepted', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { status },
            { new: true }
        ).populate('buyer', 'name businessName phone');

        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: `Order status updated to ${status}`, order });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// @route   PUT /api/employee/admin/buyer/payment/:orderId
// @desc    Record payment received + farmer payout + mark settlement
// @access  Private/Admin
router.put('/admin/buyer/payment/:orderId', protect, checkAdmin, async (req, res) => {
    try {
        const { amountReceived, farmerAmount, settlement } = req.body;

        const update = {};
        if (amountReceived !== undefined) update.amountReceived = Number(amountReceived);
        if (farmerAmount !== undefined) update.farmerAmount = Number(farmerAmount);
        if (settlement !== undefined) update.settlement = settlement;

        // Auto-complete order if fully settled
        if (settlement === 'settled') update.status = 'completed';

        const order = await Order.findByIdAndUpdate(req.params.orderId, update, { new: true })
            .populate('buyer', 'name businessName phone');

        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Payment updated', order });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// =====================================================================
// BUYER TRADING - CSV EXPORT ROUTES (use Authorization header)
// =====================================================================

function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    return '"' + String(val).replace(/"/g, '""') + '"';
}

// @route   GET /api/employee/admin/buyer/export/buyers
// @access  Private/Admin
router.get('/admin/buyer/export/buyers', protect, checkAdmin, async (req, res) => {
    try {
        const buyers = await User.find({ role: 'buyer' }).lean();
        const orders = await Order.find({ buyer: { $in: buyers.map(b => b._id) } }).lean();
        const rows = buyers.map(b => {
            const ob = orders.filter(o => String(o.buyer) === String(b._id));
            const totalQty = ob.reduce((s, o) => s + (o.quantity || 0), 0);
            const totalVal = ob.reduce((s, o) => s + (o.totalAmount || 0), 0);
            return [escapeCSV(b.businessName || b.name), escapeCSV(b.phone), escapeCSV(b.email), escapeCSV(b.address), ob.length, totalQty, totalVal, escapeCSV(b.status)].join(',');
        });
        const csv = '\uFEFF' + 'Name,Phone,Email,Address,Total Orders,Total Qty (Q),Total Value (Rs),Status\n' + rows.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Buyers_Export.csv"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(csv);
    } catch (e) { res.status(500).json({ error: 'Export failed' }); }
});

// @route   GET /api/employee/admin/buyer/export/requests
// @access  Private/Admin
router.get('/admin/buyer/export/requests', protect, checkAdmin, async (req, res) => {
    try {
        const orders = await Order.find({ status: 'pending' }).populate('buyer', 'name phone businessName address').lean();
        const rows = orders.map(o => {
            const b = o.buyer || {};
            return [escapeCSV(b.businessName || b.name), escapeCSV(b.phone), escapeCSV(b.address), escapeCSV(o.crop), o.quantity || '', o.pricePerQuintal || '', escapeCSV(o.note), escapeCSV(new Date(o.createdAt).toLocaleDateString('en-IN'))].join(',');
        });
        const csv = '\uFEFF' + 'Buyer,Phone,Location,Crop,Quantity (Q),Rate (Rs/Q),Note,Date\n' + rows.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Buyer_Requests.csv"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(csv);
    } catch (e) { res.status(500).json({ error: 'Export failed' }); }
});

// @route   GET /api/employee/admin/buyer/export/reconciliation
// @access  Private/Admin
router.get('/admin/buyer/export/reconciliation', protect, checkAdmin, async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        const commissionRate = settings.commissions.buyerTrading || 0;
        const orders = await Order.find({ status: { $ne: 'pending' } }).populate('buyer', 'name phone businessName address').lean();
        
        const rows = orders.map(o => {
            const b = o.buyer || {};
            const qty = parseQuantityInQuintals(o.quantity);
            const cropPrice = qty * (o.pricePerQuintal || 0);
            const commission = o.commission || (cropPrice * commissionRate / 100);
            const totalPayable = cropPrice + commission;
            const amountReceived = o.amountReceived || 0;
            return [escapeCSV(o._id), escapeCSV(new Date(o.createdAt).toLocaleDateString('en-IN')), escapeCSV(b.businessName || b.name), escapeCSV(b.address), escapeCSV(o.crop), qty, totalPayable, amountReceived, totalPayable - amountReceived, o.farmerAmount || 0, escapeCSV(o.settlement || 'pending')].join(',');
        });
        const csv = '\uFEFF' + 'Order ID,Date,Buyer,Location,Crop,Quantity (Q),Total Payable (Rs),Amount Received (Rs),Pending (Rs),Farmer Payout (Rs),Settlement\n' + rows.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Payment_Reconciliation.csv"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(csv);
    } catch (e) { res.status(500).json({ error: 'Export failed' }); }
});

// ==================== SHOP E-COMMERCE ADMIN (B2B/B2C) ====================

// @route   GET /api/employee/admin/shop/stats
// @access  Private/Admin
router.get('/admin/shop/stats', protect, checkAdmin, async (req, res) => {
    try {
        const [totalShops, activeShops, totalProducts] = await Promise.all([
            User.countDocuments({ role: 'shop' }),
            User.countDocuments({ role: 'shop', status: 'approved' }),
            Item.countDocuments()
        ]);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const ordersThisMonth = await ShopOrder.find({ createdAt: { $gte: startOfMonth } }).lean();
        const thisMonthRevenue = ordersThisMonth.reduce((s, o) => s + (o.totalAmount || 0), 0);

        const lowStockItems = await Item.find({ stockQty: { $lt: 20 } })
            .populate('owner', 'businessName name phone')
            .lean();

        const lowStockAlerts = lowStockItems.map(i => ({
            _id: i._id,
            itemName: i.name, // Fixed field name to match frontend expected "itemName" or "name"
            shopName: i.owner?.businessName || i.owner?.name || 'Unknown',
            shopPhone: i.owner?.phone || '',
            stock: i.stockQty || 0
        }));

        res.json({
            totalShops,
            activeShops,
            totalProducts,
            thisMonthOrders: ordersThisMonth.length,
            thisMonthRevenue,
            lowStockAlerts
        });
    } catch (e) {
        console.error('Shop stats error:', e);
        res.status(500).json({ error: 'Failed to fetch shop stats' });
    }
});

// @route   GET /api/employee/admin/shops
// @access  Private/Admin
router.get('/admin/shops', protect, checkAdmin, async (req, res) => {
    try {
        console.log('Fetching all shops for admin...');
        const shops = await User.find({ role: 'shop' }).sort({ createdAt: -1 }).lean();

        const enriched = await Promise.all(shops.map(async (s) => {
            const [items, totalOrdersDocs] = await Promise.all([
                Item.find({ owner: s._id }).select('category').lean(),
                ShopOrder.find({ owner: s._id }).select('status').lean()
            ]);

            const categories = [...new Set(items.map(i => i.category || 'General'))];

            return {
                _id: s._id,
                businessName: s.businessName || s.name,
                name: s.name,
                phone: s.phone,
                email: s.email,
                address: s.address,
                status: s.status,
                joinedAt: s.createdAt,
                productsCount: items.length,
                categories,
                totalOrders: totalOrdersDocs.length,
                fulfilledOrders: totalOrdersDocs.filter(o => o.status === 'DELIVERED').length,
                // Additional Info
                aadhaarNumber: s.aadhaarNumber,
                aadhaarDocUrl: s.aadhaarDocUrl,
                panNumber: s.panNumber,
                panDocUrl: s.panDocUrl,
                gstNumber: s.gstNumber,
                licenseNumber: s.licenseNumber,
                businessLicenseUrl: s.businessLicenseUrl,
                bankDetails: s.bankDetails
            };
        }));

        res.json(enriched);
    } catch (e) {
        console.error('Shops fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
});

// @route   GET /api/employee/admin/shop/orders
// @access  Private/Admin
router.get('/admin/shop/orders', protect, checkAdmin, async (req, res) => {
    try {
        const orders = await ShopOrder.find()
            .populate('owner', 'businessName name phone address')
            .populate('buyer', 'name businessName phone address')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const enriched = orders.map(o => {
            const itemCount = o.items ? o.items.length : 0;
            const topItem = o.items && o.items.length > 0 ? o.items[0].name : 'Unknown Item';
            const itemString = itemCount > 1 ? `${topItem} + ${itemCount - 1} more` : topItem;

            return {
                _id: o._id,
                shopName: o.owner?.businessName || o.owner?.name || 'Unknown Shop',
                shopPhone: o.owner?.phone || '',
                buyerName: o.buyer?.name || o.buyer?.businessName || 'Unknown Buyer',
                buyerPhone: o.buyer?.phone || '',
                buyerLocation: o.buyer?.address || o.deliveryAddress?.fullAddress || 'No Address',
                itemsSummary: itemString,
                itemCount,
                totalAmount: o.totalAmount || 0,
                status: o.status,
                createdAt: o.createdAt
            };
        });

        res.json(enriched);
    } catch (e) {
        console.error('Shop orders error:', e);
        res.status(500).json({ error: 'Failed to fetch shop orders' });
    }
});

// @route   PUT /api/employee/admin/shop/approve/:id
// @access  Private/Admin
router.put('/admin/shop/approve/:id', protect, checkAdmin, async (req, res) => {
    try {
        const shop = await User.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        shop.status = 'approved';
        await shop.save();
        res.json({ message: 'Shop approved' });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   PUT /api/employee/admin/shop/block/:id
// @access  Private/Admin
router.put('/admin/shop/block/:id', protect, checkAdmin, async (req, res) => {
    try {
        const shop = await User.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        shop.status = 'blocked';
        await shop.save();
        res.json({ message: 'Shop blocked' });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   PUT /api/employee/admin/shop/update/:id
// @desc    Update shop partner details (Admin only)
// @access  Private/Admin
router.put('/admin/shop/update/:id', protect, checkAdmin, async (req, res) => {
    try {
        const shop = await User.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const {
            name, businessName, email, phone, address,
            aadhaarNumber, panNumber, gstNumber, licenseNumber,
            bankDetails
        } = req.body;

        if (name) shop.name = name;
        if (businessName) shop.businessName = businessName;
        if (email) shop.email = email;
        if (phone) shop.phone = phone;
        if (address) shop.address = address;
        if (aadhaarNumber) shop.aadhaarNumber = aadhaarNumber;
        if (panNumber) shop.panNumber = panNumber;
        if (gstNumber) shop.gstNumber = gstNumber;
        if (licenseNumber) shop.licenseNumber = licenseNumber;

        if (bankDetails) {
            if (!shop.bankDetails) shop.bankDetails = {};
            if (bankDetails.holderName !== undefined) shop.bankDetails.holderName = bankDetails.holderName;
            if (bankDetails.bankName !== undefined) shop.bankDetails.bankName = bankDetails.bankName;
            if (bankDetails.accountNumber !== undefined) shop.bankDetails.accountNumber = bankDetails.accountNumber;
            if (bankDetails.ifscCode !== undefined) shop.bankDetails.ifscCode = bankDetails.ifscCode;
            if (bankDetails.bankAddress !== undefined) shop.bankDetails.bankAddress = bankDetails.bankAddress;
            shop.markModified('bankDetails');
        }

        await shop.save();
        res.json({ message: 'Shop details updated successfully' });
    } catch (e) {
        console.error('Update shop error:', e);
        res.status(500).json({ error: 'Failed to update shop' });
    }
});

// =============================================
// ADMIN: LABOUR AGGREGATION MANAGEMENT ROUTES
// =============================================

// @route   GET /api/employee/admin/labour/stats
// @desc    Get KPI stats for Labour dashboard (Admin)
// @access  Private/Admin
router.get('/admin/labour/stats', protect, checkModule('labour'), async (req, res) => {
    try {
        const totalLabourers = await User.countDocuments({ role: 'labour' });
        const activeLabourers = await User.countDocuments({ role: 'labour', 'labourDetails.availability': 'active' });
        const kycVerified = await User.countDocuments({ role: 'labour', status: 'approved' });

        const activeJobs = await LabourJob.countDocuments({ status: 'In Progress' });
        const totalJobsCompleted = await LabourJob.countDocuments({ status: 'Completed' });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const recentJobs = await LabourJob.find({ status: 'Completed', createdAt: { $gte: startOfMonth } });
        const thisMonthRevenue = recentJobs.reduce((sum, job) => sum + (job.amount || 0), 0);

        res.json({
            totalLabourers,
            activeLabourers,
            kycVerified,
            activeJobs,
            totalJobsCompleted,
            thisMonthRevenue
        });
    } catch (e) {
        console.error('Admin labour stats error:', e);
        res.status(500).json({ error: 'Failed to fetch labour stats' });
    }
});

// @route   GET /api/employee/admin/labours
// @desc    Get all labourers with their skills and aggregated job stats
// @access  Private/Admin
router.get('/admin/labours', protect, checkModule('labour'), async (req, res) => {
    try {
        const labours = await User.find({ role: 'labour' })
            .select('name businessName phone email address status employeeCode createdAt aadhaarNumber aadhaarDocUrl labourDetails bankDetails walletBalance ratePerDay ratePerHour jobNotificationOn whatsappOn maxDistanceKm')
            .sort({ createdAt: -1 })
            .lean();

        const enriched = labours.map(labour => {
            return {
                _id: labour._id,
                name: labour.businessName || labour.name,
                labourCode: labour.employeeCode || labour._id.toString().substring(18),
                phone: labour.phone,
                email: labour.email || '',
                address: labour.address || '',
                location: labour.address || '',
                status: labour.status,
                joinedAt: labour.createdAt,
                skills: labour.labourDetails?.skills || [],
                availability: labour.labourDetails?.availability || 'inactive',
                jobsDone: labour.labourDetails?.jobsCompleted || 0,
                rating: labour.labourDetails?.rating || 0,
                aadhaarNumber: labour.aadhaarNumber || '',
                aadhaarDocUrl: labour.aadhaarDocUrl || '',
                walletBalance: labour.walletBalance || 0,
                ratePerDay: labour.ratePerDay || 700,
                ratePerHour: labour.ratePerHour || 90,
                bankDetails: labour.bankDetails || {},
                jobNotificationOn: labour.jobNotificationOn,
                whatsappOn: labour.whatsappOn,
                maxDistanceKm: labour.maxDistanceKm || 15,
                createdAt: labour.createdAt
            };
        });

        res.json(enriched);
    } catch (e) {
        console.error('Admin labourers fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch labourers' });
    }
});

// @route   PUT /api/employee/admin/labour/update/:id
// @desc    Admin: Update any field of a labourer (bypassing restriction)
// @access  Private/Admin
router.put('/admin/labour/update/:id', protect, checkModule('labour'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'labour') return res.status(404).json({ error: 'Labourer not found' });

        // Update basic fields
        if (req.body.name) user.name = req.body.name;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.email) user.email = req.body.email;
        if (req.body.address) user.address = req.body.address;
        if (req.body.aadhaarNumber) user.aadhaarNumber = req.body.aadhaarNumber;

        // Update Bank Details
        if (req.body.bankDetails) {
            const b = req.body.bankDetails;
            user.bankDetails = {
                holderName: b.holderName || (user.bankDetails ? user.bankDetails.holderName : ''),
                bankName: b.bankName || (user.bankDetails ? user.bankDetails.bankName : ''),
                accountNumber: b.accountNumber || (user.bankDetails ? user.bankDetails.accountNumber : ''),
                ifscCode: b.ifscCode || (user.bankDetails ? user.bankDetails.ifscCode : ''),
                bankAddress: b.bankAddress || (user.bankDetails ? user.bankDetails.bankAddress : ''),
                bankDocUrl: b.bankDocUrl || (user.bankDetails ? user.bankDetails.bankDocUrl : '')
            };
        }
        
        // Update Labour Details (Skills & Description)
        if (user.role === 'labour') {
            if (!user.labourDetails) user.labourDetails = { skills: [] };
            if (req.body.skills !== undefined) {
                user.labourDetails.skills = Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills];
            }
            if (req.body.skillDescription !== undefined) {
                user.labourDetails.skillDescription = req.body.skillDescription;
            }
            user.markModified('labourDetails');
        }

        await user.save();
        res.json({ message: 'Labourer profile updated successfully by Admin', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/employee/admin/labour/jobs
// @desc    Get all recent labour jobs
// @access  Private/Admin
router.get('/admin/labour/jobs', protect, checkModule('labour'), async (req, res) => {
    try {
        const jobs = await LabourJob.find()
            .populate('labour', 'name businessName address')
            .populate('farmer', 'name address')
            .populate('assignedTo', 'name employeeCode')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const enriched = jobs.map(job => {
            return {
                _id: job._id,
                labourName: job.labour?.businessName || job.labour?.name || 'Unknown',
                labourLocation: job.labour?.address || '',
                farmerName: job.farmer?.name || 'Unknown',
                farmerLocation: job.farmer?.address || '',
                workType: job.workType,
                priceType: job.priceType || 'daily',
                hours: job.hours || 0,
                days: job.days || 0,
                hoursWorked: job.hoursWorked,
                acresCovered: job.acresCovered,
                amount: job.amount,
                rating: job.rating,
                status: job.status,
                assignedTo: job.assignedTo?._id || null,
                assignedEmployeeName: job.assignedTo?.name || null,
                assignedEmployeeId: job.assignedTo?.employeeCode || null,
                createdAt: job.createdAt
            };
        });

        res.json(enriched);
    } catch (e) {
        console.error('Admin labour jobs fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch labour jobs' });
    }
});

// @route   PATCH /api/employee/admin/labour/jobs/:id/assign
// @desc    Assign a labour job to an employee
// @access  Private/Admin
router.patch('/admin/labour/jobs/:id/assign', protect, checkModule('labour'), async (req, res) => {
    try {
        console.log('--- LABOUR ASSIGN REQUEST RECEIVED ---');
        console.log('ID:', req.params.id);
        console.log('Body:', req.body);

        const { employeeId } = req.body;
        if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

        const job = await LabourJob.findByIdAndUpdate(
            req.params.id,
            { assignedTo: employeeId },
            { new: true }
        );

        if (!job) {
            console.log('Job not found:', req.params.id);
            return res.status(404).json({ error: 'Job not found' });
        }

        console.log('Job assigned successfully');
        res.json({ message: 'Job assigned successfully', job });
    } catch (e) {
        console.error('Admin labour job assign error:', e);
        res.status(500).json({ error: 'Failed to assign job: ' + e.message });
    }
});
// @desc    Export all labourers as CSV
// @access  Private/Admin
router.get('/admin/labour/export', protect, checkModule('labour'), async (req, res) => {
    try {
        const labourers = await User.find({ role: 'labour' }).lean();
        const rows = labourers.map(l => {
            const skills = (l.labourDetails?.skills || []).join('; ');
            const availability = l.labourDetails?.availability || 'inactive';
            const jobsDone = l.labourDetails?.jobsCompleted || 0;
            const rating = l.labourDetails?.rating || 0;

            return [
                escapeCSV(l.businessName || l.name),
                escapeCSV(l.phone),
                escapeCSV(l.address || ''),
                escapeCSV(skills),
                escapeCSV(availability),
                jobsDone,
                rating,
                escapeCSV(l.status),
                escapeCSV(new Date(l.createdAt).toLocaleDateString('en-IN'))
            ].join(',');
        });

        const csv = '\uFEFF' + 'Name,Phone,Location,Skills,Availability,Jobs Done,Rating,KYC Status,Joined Date\n' + rows.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Labourers_Export.csv"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(csv);
    } catch (e) {
        console.error('Labour export error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// @route   PUT /api/employee/admin/labour/approve/:id
// @desc    Approve a labourer
// @access  Private/Admin
router.put('/admin/labour/approve/:id', protect, checkModule('labour'), async (req, res) => {
    try {
        const labour = await User.findById(req.params.id);
        if (!labour) return res.status(404).json({ error: 'Labourer not found' });
        labour.status = 'approved';
        await labour.save();
        res.json({ message: 'Labourer approved successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to approve labourer' });
    }
});

// @route   PUT /api/employee/admin/labour/reject/:id
// @desc    Reject/Suspend a labourer
// @access  Private/Admin
router.put('/admin/labour/reject/:id', protect, checkModule('labour'), async (req, res) => {
    try {
        const labour = await User.findById(req.params.id);
        if (!labour) return res.status(404).json({ error: 'Labourer not found' });
        labour.status = 'rejected';
        await labour.save();
        res.json({ message: 'Labourer suspended' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to reject labourer' });
    }
});

// @route   PUT /api/employee/admin/labour/availability/:id
// @desc    Update labourer availability
// @access  Private/Admin
router.put('/admin/labour/availability/:id', protect, checkAdmin, async (req, res) => {
    try {
        const { availability } = req.body;
        const labour = await User.findById(req.params.id);
        if (!labour) return res.status(404).json({ error: 'Labourer not found' });
        labour.labourDetails.availability = availability;
        await labour.save();
        res.json({ message: `Availability set to ${availability}` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// =====================================================================
// EQUIPMENT RENTAL   ADMIN ROUTES
// =====================================================================

// @route   GET /api/employee/admin/rental/stats
// @desc    KPI stats for Equipment Rental dashboard
// @access  Private/Admin
router.get('/admin/rental/stats', protect, checkModule('equipment'), async (req, res) => {
    try {
        const totalBookings = await Rental.countDocuments();
        const activeBookings = await Rental.countDocuments({ status: { $in: ['New', 'Accepted', 'In Progress'] } });
        const completedBookings = await Rental.countDocuments({ status: 'Completed' });
        const cancelledBookings = await Rental.countDocuments({ status: 'Cancelled' });

        // Revenue & commission from completed bookings
        const revenueAgg = await Rental.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCommission: { $sum: '$platformCommission' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
        const totalCommission = revenueAgg[0]?.totalCommission || 0;

        // Cash collection stats
        const cashCollected = await Rental.countDocuments({ cashCollected: true });
        const cashPending = await Rental.countDocuments({ status: 'Completed', cashCollected: false });

        // Total active machines & equipment providers
        const totalMachines = await Machine.countDocuments();
        const totalProviders = await User.countDocuments({ role: 'equipment' });

        res.json({
            totalBookings, activeBookings, completedBookings, cancelledBookings,
            totalRevenue, totalCommission,
            cashCollected, cashPending,
            totalMachines, totalProviders
        });
    } catch (e) {
        console.error('Admin rental stats error:', e);
        res.status(500).json({ error: 'Failed to fetch rental stats' });
    }
});

// @route   GET /api/employee/admin/rental/bookings
// @desc    Get all rental bookings with full details
// @access  Private/Admin
router.get('/admin/rental/bookings', protect, checkModule('equipment'), async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const filter = status && status !== 'all' ? { status } : {};

        const bookings = await Rental.find(filter)
            .populate('machine', 'name priceDay priceHour village')
            .populate('owner', 'name phone address businessName')
            .populate('buyer', 'name phone address')
            .populate('assignedFieldExec', 'name phone')
            .populate('cashCollectedBy', 'name phone')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Rental.countDocuments(filter);

        const enriched = bookings.map(b => {
            const days = b.fromDate && b.toDate
                ? Math.max(1, Math.ceil((new Date(b.toDate) - new Date(b.fromDate)) / (1000 * 60 * 60 * 24)))
                : 1;
            return {
                _id: b._id,
                bookingId: 'BK-' + b._id.toString().substring(18).toUpperCase(),
                machine: { name: b.machine?.name || 'N/A', village: b.machine?.village || '', priceDay: b.machine?.priceDay || 0 },
                provider: { name: b.owner?.businessName || b.owner?.name || 'N/A', phone: b.owner?.phone || '', address: b.owner?.address || '' },
                farmer: { name: b.buyer?.name || 'N/A', phone: b.buyer?.phone || '', address: b.buyer?.address || '' },
                fromDate: b.fromDate,
                toDate: b.toDate,
                days,
                totalAmount: b.totalAmount || 0,
                platformCommission: b.platformCommission || 0,
                ownerPayout: b.ownerPayout || 0,
                status: b.status,
                cancelReason: b.cancelReason || '',
                assignedFieldExec: b.assignedFieldExec ? { id: b.assignedFieldExec._id, name: b.assignedFieldExec.name, phone: b.assignedFieldExec.phone } : null,
                cashCollected: b.cashCollected,
                cashCollectedAt: b.cashCollectedAt,
                cashCollectedBy: b.cashCollectedBy ? { name: b.cashCollectedBy.name } : null,
                cashNote: b.cashNote || '',
                createdAt: b.createdAt
            };
        });

        res.json({ bookings: enriched, total, page: Number(page) });
    } catch (e) {
        console.error('Admin rental bookings error:', e);
        res.status(500).json({ error: 'Failed to fetch rental bookings' });
    }
});

// @route   PUT /api/employee/admin/rental/bookings/:id/status
// @desc    Admin update rental status
// @access  Private/Admin
router.put('/admin/rental/bookings/:id/status', protect, checkModule('equipment'), async (req, res) => {
    try {
        const { status, cancelReason } = req.body;
        const validStatuses = ['New', 'Accepted', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const rental = await Rental.findById(req.params.id);
        if (!rental) return res.status(404).json({ error: 'Rental not found' });

        rental.status = status;
        if (status === 'Cancelled' && cancelReason) rental.cancelReason = cancelReason;

        // Auto-calculate commission when completing
        if (status === 'Completed' && rental.totalAmount > 0 && rental.platformCommission === 0) {
            rental.platformCommission = Math.round(rental.totalAmount * 0.05);
            rental.ownerPayout = rental.totalAmount - rental.platformCommission;
        }
        await rental.save();
        res.json({ message: `Status updated to ${status}`, rental });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// @route   PUT /api/employee/admin/rental/bookings/:id/assign
// @desc    Assign a field executive to a rental booking
// @access  Private/Admin
router.put('/admin/rental/bookings/:id/assign', protect, checkModule('equipment'), async (req, res) => {
    try {
        const { fieldExecId } = req.body;
        const rental = await Rental.findById(req.params.id);
        if (!rental) return res.status(404).json({ error: 'Rental not found' });

        const fe = await User.findOne({ _id: fieldExecId, role: 'field_executive' });
        if (!fe) return res.status(404).json({ error: 'Field executive not found' });

        rental.assignedFieldExec = fieldExecId;
        await rental.save();
        res.json({ message: `Assigned to ${fe.name}` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to assign field executive' });
    }
});

// @route   PUT /api/employee/admin/rental/bookings/:id/collect
// @desc    Mark cash as collected for a completed booking
// @access  Private/Admin
router.put('/admin/rental/bookings/:id/collect', protect, checkModule('equipment'), async (req, res) => {
    try {
        const { cashNote } = req.body;
        const rental = await Rental.findById(req.params.id);
        if (!rental) return res.status(404).json({ error: 'Rental not found' });

        rental.cashCollected = true;
        rental.cashCollectedAt = new Date();
        rental.cashCollectedBy = req.user.id;
        if (cashNote) rental.cashNote = cashNote;
        await rental.save();
        res.json({ message: 'Cash collection marked successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to mark cash collection' });
    }
});

// @route   GET /api/employee/admin/rental/field-execs
// @desc    Get all field executives for assignment dropdown
// @access  Private/Admin
router.get('/admin/rental/field-execs', protect, checkModule('equipment'), async (req, res) => {
    try {
        const fes = await User.find({ role: 'field_executive' }).select('name phone address').lean();
        res.json(fes);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch field executives' });
    }
});

// @route   GET /api/employee/admin/rental/cash-collections
// @desc    Get all cash collections (completed + collected)
// @access  Private/Admin
router.get('/admin/rental/cash-collections', protect, checkModule('equipment'), async (req, res) => {
    try {
        const collections = await Rental.find({ cashCollected: true })
            .populate('machine', 'name')
            .populate('owner', 'name phone businessName')
            .populate('buyer', 'name phone')
            .populate('cashCollectedBy', 'name')
            .sort({ cashCollectedAt: -1 });

        const rows = collections.map(c => ({
            _id: c._id,
            bookingId: 'BK-' + c._id.toString().substring(18).toUpperCase(),
            machine: c.machine?.name || 'N/A',
            provider: c.owner?.businessName || c.owner?.name || 'N/A',
            farmer: c.buyer?.name || 'N/A',
            totalAmount: c.totalAmount || 0,
            commission: c.platformCommission || 0,
            collectedBy: c.cashCollectedBy?.name || 'Admin',
            collectedAt: c.cashCollectedAt,
            note: c.cashNote || ''
        }));

        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch cash collections' });
    }
});

// @route   GET /api/employee/admin/rental/export
// @desc    Export all rental bookings as CSV
// @access  Private/Admin

// @route   GET /api/employee/admin/rental/partners
// @desc    Get all equipment partners with their machine counts and booking stats
// @access  Private/Admin
router.get('/admin/rental/partners', protect, checkModule('equipment'), async (req, res) => {
    try {
        const partners = await User.find({ role: 'equipment' })
            .select('name businessName phone email address status createdAt aadhaarDocUrl bankDetails profilePhotoUrl')
            .sort({ createdAt: -1 });

        const enriched = await Promise.all(partners.map(async (p) => {
            const [machineCount, totalBookings] = await Promise.all([
                Machine.countDocuments({ owner: p._id }),
                Rental.countDocuments({ owner: p._id })
            ]);

            return {
                _id: p._id,
                name: p.businessName || p.name,
                phone: p.phone,
                email: p.email || '',
                location: p.address || '',
                status: p.status,
                joinedAt: p.createdAt,
                machineCount,
                totalBookings,
                documentUrl: p.aadhaarDocUrl || '',
                bankDetails: p.bankDetails || {},
                profilePhotoUrl: p.profilePhotoUrl || ''
            };
        }));

        res.json(enriched);
    } catch (e) {
        console.error('Admin rental partners fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch equipment partners' });
    }
});

// @route   PUT /api/employee/admin/rental/partners/:id/status
// @desc    Update partner status (approve/block/pending)
// @access  Private/Admin
router.put('/admin/rental/partners/:id/status', protect, checkModule('equipment'), async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'approved', 'blocked', 'rejected'];
        if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const partner = await User.findOne({ _id: req.params.id, role: 'equipment' });
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        partner.status = status;
        await partner.save();
        res.json({ message: `Partner status updated to ${status}`, status: partner.status });
    } catch (e) {
        console.error('Partner status update error:', e);
        res.status(500).json({ error: 'Failed to update partner status' });
    }
});

// @route   PUT /api/employee/admin/rental/partners/:id/bank
// @desc    Update partner bank details
// @access  Private/Admin
router.put('/admin/rental/partners/:id/bank', protect, checkModule('equipment'), async (req, res) => {
    console.log(`[DEBUG] Bank update request for ID: ${req.params.id}`);
    try {
        const { holderName, bankName, accountNumber, ifscCode } = req.body;
        const partner = await User.findOne({ _id: req.params.id, role: 'equipment' });
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        const currentDetails = partner.bankDetails || {};
        partner.bankDetails = {
            holderName: holderName || currentDetails.holderName || '',
            bankName: bankName || currentDetails.bankName || '',
            accountNumber: accountNumber || currentDetails.accountNumber || '',
            ifscCode: ifscCode || currentDetails.ifscCode || ''
        };

        await partner.save();
        res.json({ message: 'Bank details updated successfully', bankDetails: partner.bankDetails });
    } catch (e) {
        console.error('Partner bank update error:', e);
        res.status(500).json({ error: 'Failed to update bank details' });
    }
});

// ==========================================
// KYC & COMPLIANCE MANAGEMENT (Admin)
// ==========================================

// @route   GET /api/employee/admin/kyc/stats
// @desc    Get KYC verification statistics
// @access  Private/Admin
router.get('/admin/kyc/stats', protect, checkModule('kyc'), async (req, res) => {
    try {
        const roles = ['ksp', 'shop', 'soil', 'equipment', 'labour', 'field_executive'];
        const stats = await User.aggregate([
            { $match: { role: { $in: roles } } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formatted = {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0
        };

        stats.forEach(s => {
            if (s._id === 'pending') formatted.pending = s.count;
            if (s._id === 'approved') formatted.approved = s.count;
            if (s._id === 'rejected') formatted.rejected = s.count;
            formatted.total += s.count;
        });

        res.json(formatted);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch KYC stats' });
    }
});

// @route   GET /api/employee/admin/kyc/list
// @desc    Get filterable list of partners for KYC
// @access  Private/Admin
router.get('/admin/kyc/list', protect, checkModule('kyc'), async (req, res) => {
    try {
        const { status, role, search } = req.query;
        let query = { role: { $in: ['ksp', 'shop', 'soil', 'equipment', 'labour', 'field_executive'] } };

        if (status && status !== 'all') query.status = status;
        if (role && role !== 'all') query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { businessName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('name businessName phone role status createdAt aadhaarNumber panNumber gstNumber aadhaarDocUrl panDocUrl businessLicenseUrl')
            .sort({ createdAt: -1 })
            .lean();

        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch KYC list' });
    }
});

// @route   GET /api/employee/admin/kyc/details/:id
// @desc    Get full KYC details for a specific user
// @access  Private/Admin
router.get('/admin/kyc/details/:id', protect, checkAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('kycVerifiedBy', 'name email')
            .lean();

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch KYC details' });
    }
});

// @route   PUT /api/employee/admin/kyc/verify/:id
// @desc    Approve or Reject KYC for a partner
// @access  Private/Admin
router.put('/admin/kyc/verify/:id', protect, checkAdmin, async (req, res) => {
    try {
        const { action, remarks } = req.body; // action: 'approve' or 'reject'
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = status;
        user.kycRemarks = remarks || '';
        user.kycVerifiedAt = new Date();
        user.kycVerifiedBy = req.user.id;

        await user.save();
        res.json({ message: `Partner ${status} successfully`, user: { _id: user._id, status: user.status } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// @route   GET /api/employee/admin/kyc/export
// @desc    Export KYC data as CSV
// @access  Private/Admin
router.get('/admin/kyc/export', protect, checkAdmin, async (req, res) => {
    try {
        const roles = ['ksp', 'shop', 'soil', 'equipment', 'labour', 'field_executive'];
        const users = await User.find({ role: { $in: roles } }).lean();

        const rows = users.map(u => [
            escapeCSV(u.businessName || u.name),
            escapeCSV(u.role),
            escapeCSV(u.phone),
            escapeCSV(u.aadhaarNumber || ''),
            escapeCSV(u.panNumber || ''),
            escapeCSV(u.gstNumber || ''),
            escapeCSV(u.status),
            escapeCSV(u.kycVerifiedAt ? new Date(u.kycVerifiedAt).toLocaleDateString() : 'N/A'),
            escapeCSV(u.kycRemarks || '')
        ].join(','));

        const csv = '\uFEFF' +
            'Business/Name,Role,Phone,Aadhaar,PAN,GST,Status,Verified Date,Remarks\n' +
            rows.join('\n');

        res.attachment('KYC_Compliance_Report.csv');
        res.status(200).send(csv);
    } catch (e) {
        console.error('KYC export error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

router.get('/admin/rental/export', protect, checkModule('equipment'), async (req, res) => {
    try {
        const bookings = await Rental.find({})
            .populate('machine', 'name village')
            .populate('owner', 'name phone businessName')
            .populate('buyer', 'name phone')
            .populate('assignedFieldExec', 'name')
            .lean();

        const rows = bookings.map(b => {
            const days = b.fromDate && b.toDate
                ? Math.max(1, Math.ceil((new Date(b.toDate) - new Date(b.fromDate)) / (1000 * 60 * 60 * 24)))
                : 1;
            return [
                escapeCSV('BK-' + b._id.toString().substring(18).toUpperCase()),
                escapeCSV(b.machine?.name || 'N/A'),
                escapeCSV(b.machine?.village || ''),
                escapeCSV(b.owner?.businessName || b.owner?.name || 'N/A'),
                escapeCSV(b.owner?.phone || ''),
                escapeCSV(b.buyer?.name || 'N/A'),
                escapeCSV(b.buyer?.phone || ''),
                days,
                b.totalAmount || 0,
                b.platformCommission || 0,
                b.ownerPayout || 0,
                escapeCSV(b.status),
                escapeCSV(b.assignedFieldExec?.name || ''),
                b.cashCollected ? 'Yes' : 'No',
                escapeCSV(new Date(b.createdAt).toLocaleDateString('en-IN'))
            ].join(',');
        });

        const csv = '\uFEFF' +
            'Booking ID,Machine,Village,Provider,Provider Phone,Farmer,Farmer Phone,Days,Total (Rs),Commission (Rs),Provider Payout (Rs),Status,Field Executive,Cash Collected,Date\n' +
            rows.join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Rental_Bookings.csv"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(csv);
    } catch (e) {
        console.error('Rental export error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// ==========================================
// KSP FRANCHISE MANAGEMENT (Admin)
// ==========================================

// @route   GET /api/employee/admin/ksp/stats
// @desc    Get key KPIs for KSP dashboards
// @access  Private/Admin
router.get('/admin/ksp/stats', protect, checkAdmin, async (req, res) => {
    try {
        const franchises = await User.find({ role: 'ksp' });
        const activeCount = franchises.filter(f => f.status === 'approved').length;
        const totalCount = franchises.length;

        const kspIds = franchises.map(f => f._id);

        let totalStockValue = 0;
        let lowStockAlerts = 0;

        const ItemObj = require('../models/Item');
        const items = await ItemObj.find({ owner: { $in: kspIds } });
        items.forEach(i => {
            totalStockValue += (i.stockQty * i.price);
            if (i.stockQty < 10) lowStockAlerts++;
        });

        // Sales this month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const ShopOrderObj = require('../models/ShopOrder');
        const thisMonthOrders = await ShopOrderObj.find({
            owner: { $in: kspIds },
            createdAt: { $gte: startOfMonth },
            status: { $ne: 'CANCELLED' }
        });

        const salesThisMonth = thisMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        const totalWalletBalance = franchises.reduce((sum, f) => sum + (f.walletBalance || 0), 0);

        res.json({
            totalFranchises: totalCount,
            activeFranchises: activeCount,
            totalStockValue,
            salesThisMonth,
            lowStockAlerts,
            totalWalletBalance
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch KSP stats' });
    }
});

// @route   GET /api/employee/admin/ksp/franchises
// @desc    Get all KSP franchises with their stock and wallet
// @access  Private/Admin
router.get('/admin/ksp/franchises', protect, checkAdmin, async (req, res) => {
    try {
        const franchises = await User.find({ role: 'ksp' }).lean();
        const kspIds = franchises.map(f => f._id);

        const ItemObj = require('../models/Item');
        const items = await ItemObj.find({ owner: { $in: kspIds } }).lean();

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const ShopOrderObj = require('../models/ShopOrder');
        const thisMonthOrders = await ShopOrderObj.find({
            owner: { $in: kspIds },
            createdAt: { $gte: startOfMonth },
            status: { $ne: 'CANCELLED' }
        }).lean();

        const data = franchises.map(f => {
            const fItems = items.filter(i => i.owner.toString() === f._id.toString());
            const stockValue = fItems.reduce((sum, item) => sum + (item.stockQty * item.price), 0);
            const lowStockCount = fItems.filter(i => i.stockQty < 10).length;

            const fOrders = thisMonthOrders.filter(o => o.owner.toString() === f._id.toString());
            const salesThisMonth = fOrders.reduce((sum, order) => sum + order.totalAmount, 0);

            return {
                _id: f._id,
                franchiseName: f.businessName || `${f.name}'s Center`,
                ownerName: f.name,
                phone: f.phone,
                location: f.address,
                stockValue,
                walletBalance: f.walletBalance || 0,
                walletNumber: f.walletNumber,
                salesThisMonth,
                status: f.status,
                lowStockCount
            };
        });

        const rajan = data.find(f => f._id.toString() === '69b930538be41ec37832c23e');
        if (rajan) console.log('RAJAN DATA TO FRONTEND:', rajan.walletNumber);

        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch franchises' });
    }
});

// @route   POST /api/employee/admin/ksp/direct-recharge
// @desc    Admin directly recharges a KSP wallet
router.post('/admin/ksp/direct-recharge', protect, checkAdmin, async (req, res) => {
    try {
        const { id, amount, note } = req.body;
        if (!id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid ID or amount' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.walletBalance = (user.walletBalance || 0) + Number(amount);
        await user.save();

        // Create transaction record
        await Transaction.create({
            transactionId: 'RECH' + Date.now().toString().substring(6),
            recipient: id,
            module: 'KSP',
            amount: Number(amount),
            type: 'Credit',
            paymentMode: 'Cash',
            status: 'Completed',
            performedBy: req.user._id,
            note: note || 'Direct admin recharge'
        });

        res.json({ success: true, newBalance: user.walletBalance });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Recharge failed' });
    }
});

// @route   GET /api/employee/admin/ksp/transactions/:id
// @desc    Get all transactions (Sales & Recharges) for a franchise
router.get('/admin/ksp/transactions/:id', protect, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Wallet Transactions (Recharges/Payouts)
        const txns = await Transaction.find({ recipient: id, module: 'KSP' }).sort({ createdAt: -1 }).lean();

        // 2. Get Sales History
        const sales = await FranchiseSale.find({ franchise: id }).sort({ createdAt: -1 }).lean();

        // Combine and sort
        const combined = [
            ...txns.map(t => ({
                id: t._id,
                date: t.createdAt,
                type: 'Recharge',
                amount: t.amount,
                status: t.status,
                note: t.note || t.paymentMode
            })),
            ...sales.map(s => ({
                id: s._id,
                date: s.createdAt,
                type: 'Sale',
                amount: s.totalAmount,
                status: s.status,
                note: `Order: ${s.items.length} items`
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(combined);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// @route   GET /api/employee/admin/ksp/inventory
// @desc    Get items mapped to a specific KSP
// @access  Private/Admin
router.get('/admin/ksp/inventory', protect, checkAdmin, async (req, res) => {
    try {
        const { kspId } = req.query;
        let query = {};

        if (kspId && kspId !== 'all') {
            query.owner = kspId;
        } else {
            const ksps = await User.find({ role: 'ksp' }).select('_id');
            query.owner = { $in: ksps.map(k => k._id) };
        }

        const ItemObj = require('../models/Item');
        const items = await ItemObj.find(query).populate('owner', 'businessName name').lean();

        // Group by category slightly mapped to frontend demands
        const grouped = items.map(i => ({
            _id: i._id,
            name: i.name,
            category: i.category, // 'seed', 'fert', 'pest', 'tool'
            stockQty: i.stockQty,
            unit: i.unit,
            ownerName: i.owner ? (i.owner.businessName || i.owner.name) : 'Unknown',
            ownerId: i.owner ? i.owner._id : null
        }));

        res.json(grouped);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// @route   GET /api/employee/admin/ksp/ledger
// @desc    Get Farmer Transactions Ledger
// @access  Private/Admin
router.get('/admin/ksp/ledger', protect, checkAdmin, async (req, res) => {
    try {
        const { paymentMode } = req.query;
        let query = { status: { $ne: 'CANCELLED' } };

        if (paymentMode && paymentMode !== 'all') {
            query.paymentMode = paymentMode.toUpperCase();
        }

        const ksps = await User.find({ role: 'ksp' }).select('_id');
        query.owner = { $in: ksps.map(k => k._id) };

        const ShopOrderObj = require('../models/ShopOrder');
        const orders = await ShopOrderObj.find(query)
            .populate('buyer', 'name phone')
            .populate('owner', 'name businessName address')
            .sort({ createdAt: -1 })
            .lean();

        const data = orders.map(o => ({
            _id: o._id,
            transactionId: 'TXN-' + new Date(o.createdAt).getFullYear() + '-' + o._id.toString().substring(18).toUpperCase(),
            farmerName: o.buyer?.name || 'N/A',
            farmerPhone: o.buyer?.phone || 'N/A',
            products: o.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', '),
            amount: o.totalAmount,
            paymentMode: o.paymentMode || 'CASH',
            franchiseName: o.owner?.businessName || o.owner?.name || 'N/A',
            location: o.owner?.address || '',
            date: o.createdAt
        }));

        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// @route   GET /api/employee/admin/ksp/wallets
// @desc    Get all wallet balances for ksp
// @access  Private/Admin
router.get('/admin/ksp/wallets', protect, checkAdmin, async (req, res) => {
    try {
        const franchises = await User.find({ role: 'ksp' }).select('name businessName phone address walletBalance walletRechargeAmount walletRechargeStatus').lean();

        const data = franchises.map((f) => ({
            _id: f._id,
            franchiseName: f.businessName || `${f.name}'s Center`,
            location: f.address,
            walletBalance: f.walletBalance || 0,
            rechargeRequest: f.walletRechargeAmount || 0,
            requestStatus: f.walletRechargeStatus || 'NONE'
        }));

        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

// @route   PUT /api/employee/admin/ksp/approve-wallet/:id
// @desc    Approve a wallet recharge request
// @access  Private/Admin
router.put('/admin/ksp/approve-wallet/:id', protect, checkAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Franchise not found' });

        if (user.walletRechargeStatus !== 'PENDING') {
            return res.status(400).json({ error: 'No pending recharge request found' });
        }

        const amount = user.walletRechargeAmount || 0;
        user.walletBalance = (user.walletBalance || 0) + amount;
        user.walletRechargeAmount = 0;
        user.walletRechargeStatus = 'NONE';

        await user.save();
        res.json({ message: `Success! ₹${amount.toLocaleString('en-IN')} added to wallet.`, balance: user.walletBalance });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to approve recharge' });
    }
});

// @route   PUT /api/employee/admin/ksp/generate-wallet/:id
// @desc    Generate a unique 11-digit wallet number for a franchise
// @access  Private/Admin
router.put('/admin/ksp/generate-wallet/:id', protect, checkAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Franchise not found' });

        if (user.walletNumber && user.walletNumber.length === 11) {
            return res.status(400).json({ error: 'Wallet number already exists for this franchise' });
        }

        let isUnique = false;
        let newWalletNumber = '';

        while (!isUnique) {
            // Generate 11 digit number starting with 9
            newWalletNumber = '9' + Math.floor(Math.random() * 9000000000 + 1000000000).toString();
            const existing = await User.findOne({ walletNumber: newWalletNumber });
            if (!existing) isUnique = true;
        }

        user.walletNumber = newWalletNumber;
        await user.save();

        res.json({ message: 'Wallet number generated successfully', walletNumber: newWalletNumber });
    } catch (e) {
        console.error('Generate Wallet Number Error:', e);
        res.status(500).json({ error: 'Failed to generate wallet number' });
    }
});

router.get('/admin/ksp/export', protect, checkAdmin, async (req, res) => {
    try {
        const { type, paymentMode } = req.query;
        let csv = '\uFEFF';
        let filename = 'KSP_Export.csv';

        if (type === 'ledger') {
            filename = 'KSP_Ledger.csv';
            const ksps = await User.find({ role: 'ksp' }).select('_id');
            const query = { owner: { $in: ksps.map(k => k._id) } };
            if (paymentMode && paymentMode !== 'all') {
                query.paymentMode = paymentMode.toUpperCase();
            }
            const ledger = await ShopOrder.find(query).populate('buyer', 'name phone').populate('owner', 'businessName').lean();
            const rows = ledger.map(o => [
                escapeCSV(o._id.toString().toUpperCase()),
                escapeCSV(o.buyer?.name || 'Walk-in'),
                escapeCSV(o.owner?.businessName || 'KSP'),
                escapeCSV(o.paymentMode || 'CASH'),
                o.totalAmount || 0,
                new Date(o.createdAt).toLocaleDateString()
            ].join(','));
            csv += 'Order ID,Farmer,Franchise,Payment Mode,Amount,Date\n' + rows.join('\n');
        } else if (type === 'wallets') {
            filename = 'KSP_Wallets.csv';
            const franchises = await User.find({ role: 'ksp' }).lean();
            const rows = franchises.map(f => [
                escapeCSV(f.businessName || f.name),
                f.walletBalance || 0,
                escapeCSV(f.walletRechargeStatus || 'NONE')
            ].join(','));
            csv += 'Franchise,Balance,Recharge Status\n' + rows.join('\n');
        } else {
            filename = 'KSP_Franchises.csv';
            const franchises = await User.find({ role: 'ksp' }).lean();
            const rows = franchises.map(f => [
                escapeCSV(f.businessName || ''),
                escapeCSV(f.name || ''),
                escapeCSV(f.phone || ''),
                escapeCSV(f.address || ''),
                f.walletBalance || 0,
                escapeCSV(f.status || '')
            ].join(','));
            csv += 'Business Name,Owner,Phone,Location,Wallet Balance,Status\n' + rows.join('\n');
        }

        res.attachment(filename);
        res.status(200).send(csv);
    } catch (e) {
        console.error('Export error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// ==========================================
// FINANCE & PAYOUTS MANAGEMENT (Admin)
// ==========================================

// @route   GET /api/employee/admin/finance/stats
// @desc    Get key KPIs for Finance Dashboard
// @access  Private/Admin
router.get('/admin/finance/stats', protect, checkModule('finance'), async (req, res) => {
    try {
        let totalPendingPayouts = 0;
        let pendingCount = 0;

        // 1. Pending Rentals (Completed but NOT paid out to equipment partner)
        // (Assuming Rental Schema has a `cashCollected` or custom flag. For now, we'll check status === 'Completed' and no existing Transaction)
        const completedRentals = await Rental.find({ status: 'Completed' }).lean();

        // 2. Pending Labour Jobs (Completed but NOT paid)
        const completedLabour = await LabourJob.find({ status: 'Completed' }).lean();

        // 3. Pending Buyer Orders (Delivered but NOT settled)
        const overdueOrders = await Order.find({ status: 'completed', assignedStatus: 'delivered', settlement: { $ne: 'settled' } }).lean();

        // 4. Find all existing Payout Transactions to exclude already-paid/processing ones
        const allTransactions = await Transaction.find({
            status: { $in: ['Pending', 'Completed'] },
            type: 'Payout'
        }).select('referenceId').lean();
        const paidRefIds = new Set(allTransactions.map(t => t.referenceId.toString()));

        // Calculate Pending Equipment
        completedRentals.forEach(r => {
            let val = (r.ownerPayout || r.totalAmount || 0);
            if (val > 0 && !paidRefIds.has(r._id.toString())) {
                totalPendingPayouts += val;
                pendingCount++;
            }
        });

        // Calculate Pending Labour
        completedLabour.forEach(l => {
            let val = (l.amount || 0);
            if (val > 0 && !paidRefIds.has(l._id.toString())) {
                totalPendingPayouts += val;
                pendingCount++;
            }
        });

        // Overdue Buyer Collections (Not a payout, but a collection, we can track as outstanding)
        // Let's keep totalPendingPayouts strictly for what WE owe.
        // We can track Field Collections separately.
        let fieldCollections = 0;
        let pendingCollectionsCount = 0;
        overdueOrders.forEach(o => {
            let due = (o.amount || 0) - (o.amountReceived || 0);
            if (due > 0) {
                fieldCollections += due;
                pendingCollectionsCount++;
            }
        });

        // Paid This Month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const thisMonthTxns = await Transaction.find({
            status: 'Completed',
            type: 'Payout',
            createdAt: { $gte: startOfMonth }
        });

        const thisMonthPaid = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);
        const completedCount = thisMonthTxns.length;

        // Today's Revenue (Platform Commission + Shop Sales)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let todayRevenue = 0;
        const todayShopOrders = await ShopOrder.find({
            createdAt: { $gte: today },
            status: { $ne: 'CANCELLED' }
        });

        // For Shop Orders, platform revenue is typically the commission/margin.
        todayRevenue += todayShopOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Platform Commissions from completed rentals today
        const todayRentals = await Rental.find({ status: 'Completed', updatedAt: { $gte: today } });
        todayRevenue += todayRentals.reduce((sum, r) => sum + (r.platformCommission || 0), 0);

        // Platform Commissions from Buyer Trading today
        const settings = await Settings.getSettings();
        const bCommissionRate = settings.commissions.buyerTrading || 0;
        const todayBuyerOrders = await Order.find({ status: 'completed', updatedAt: { $gte: today } });
        todayRevenue += todayBuyerOrders.reduce((sum, o) => {
            const commission = o.commission || ( (o.amount || (parseQuantityInQuintals(o.quantity) * (o.pricePerQuintal || 0))) * bCommissionRate / 100 );
            return sum + commission;
        }, 0);

        res.json({
            totalPendingPayouts,
            thisMonthPaid,
            todayRevenue,
            fieldCollections,
            pendingCount: pendingCount + pendingCollectionsCount,
            completedCount
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch Finance stats' });
    }
});

// @route   GET /api/employee/admin/finance/pending
// @desc    Get all pending payouts (Equipment, Labour) and collections (Buyers)
// @access  Private/Admin
router.get('/admin/finance/pending', protect, checkModule('finance'), async (req, res) => {
    try {
        const { module } = req.query; // 'all', 'equipment', 'labour', 'buyer'
        let pendingItems = [];

        // Pre-fetch all paid transactions to filter them out
        const allTransactions = await Transaction.find({ status: { $in: ['Pending', 'Completed'] } }).select('referenceId').lean();
        const paidRefIds = new Set(allTransactions.map(t => t.referenceId.toString()));

        // 1. Equipment Rentals
        if (!module || module === 'all' || module === 'equipment') {
            const completedRentals = await Rental.find({ status: 'Completed' })
                .populate('owner', 'name businessName phone bankDetails')
                .lean();

            completedRentals.forEach(r => {
                let amount = r.ownerPayout || r.totalAmount || 0;
                if (amount > 0 && !paidRefIds.has(r._id.toString())) {
                    pendingItems.push({
                        _id: r._id,
                        partnerName: r.owner?.businessName || r.owner?.name || 'Unknown',
                        partnerId: r.owner?._id,
                        module: 'Equipment',
                        period: new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                        subtext: `From ${new Date(r.fromDate).toLocaleDateString('en-GB')} to ${new Date(r.toDate).toLocaleDateString('en-GB')}`,
                        amountDue: amount,
                        amountType: 'Payout',
                        bankDetails: r.owner?.bankDetails ? `${r.owner.bankDetails.bankName} - ${r.owner.bankDetails.accountNumber.slice(-4)}` : 'No Bank Added',
                        bankIfsc: r.owner?.bankDetails?.ifscCode || '',
                        status: 'Pending'
                    });
                }
            });
        }

        // 2. Labour Jobs
        if (!module || module === 'all' || module === 'labour') {
            const completedLabour = await LabourJob.find({ status: 'Completed' })
                .populate('labour', 'name phone bankDetails')
                .lean();

            completedLabour.forEach(l => {
                let amount = l.amount || 0;
                if (amount > 0 && !paidRefIds.has(l._id.toString())) {
                    pendingItems.push({
                        _id: l._id,
                        partnerName: l.labour?.name || 'Unknown',
                        partnerId: l.labour?._id,
                        module: 'Labour',
                        period: new Date(l.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                        subtext: `${l.workType} - ${l.hoursWorked > 0 ? l.hoursWorked + ' Hrs' : l.acresCovered + ' Acres'}`,
                        amountDue: amount,
                        amountType: 'Payout',
                        bankDetails: l.labour?.bankDetails ? `${r.labour.bankDetails.bankName} - ${r.labour.bankDetails.accountNumber.slice(-4)}` : 'No Bank Added',
                        bankIfsc: l.labour?.bankDetails?.ifscCode || '',
                        status: 'Pending'
                    });
                }
            });
        }

        // 3. Buyer Outstanding (Collections)
        if (!module || module === 'all' || module === 'buyer') {
            const overdueOrders = await Order.find({ status: 'completed', assignedStatus: 'delivered', settlement: { $ne: 'settled' } })
                .populate('assignedTo', 'name businessName phone')
                .lean();

            overdueOrders.forEach(o => {
                let due = (o.amount || 0) - (o.amountReceived || 0);
                if (due > 0) {
                    pendingItems.push({
                        _id: o._id,
                        partnerName: o.assignedTo?.businessName || o.assignedTo?.name || 'Unknown',
                        partnerId: o.assignedTo?._id,
                        module: 'BuyerTrading',
                        period: new Date(o.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                        subtext: `Order ${o.crop} (${o.quantity}Q)`,
                        amountDue: due,
                        amountType: 'Collection', // Indicates we need to COLLECT this money
                        bankDetails: o.assignedTo?.phone || 'No Phone', // Usually follow up via phone for collection
                        bankIfsc: '',
                        status: 'Overdue'
                    });
                }
            });
        }

        // Sort by date (descending)
        pendingItems.sort((a, b) => new Date(b.period) - new Date(a.period));

        res.json(pendingItems);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch pending payouts' });
    }
});

// @route   PUT /api/employee/admin/finance/approve
// @desc    Approve a list of pending payouts and generate Transactions
// @access  Private/Admin
router.put('/admin/finance/approve', protect, checkModule('finance'), async (req, res) => {
    try {
        const { payouts } = req.body; // Array of { id, module, amount, partnerId }

        if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
            return res.status(400).json({ error: 'No payouts provided' });
        }

        let approvedCount = 0;

        for (const p of payouts) {
            // Check if transaction already exists for this reference
            const exists = await Transaction.findOne({ referenceId: p.id, status: { $in: ['Pending', 'Completed'] } });
            if (exists) continue; // Skip to prevent double payout

            // Create Transaction Record
            const txId = 'PAY-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

            await Transaction.create({
                transactionId: txId,
                recipient: p.partnerId,
                module: p.module,
                amount: p.amount,
                type: 'Payout',
                paymentMode: p.paymentMode || 'Bank Transfer', // Allow override
                status: p.status || 'Pending', // Default to pending for reconciliation
                referenceId: p.id,
                note: `Approved by admin ${req.user.id}`
            });

            // Update parent module tracking (Optional, mostly we rely on Transaction existence now)
            if (p.module === 'Equipment') {
                await Rental.findByIdAndUpdate(p.id, { cashCollected: true }); // Simplest flag
            } else if (p.module === 'BuyerTrading') {
                // If we are approving a "collection" receipt
                const o = await Order.findById(p.id);
                if (o) {
                    o.amountReceived = o.amount;
                    o.settlement = 'settled';
                    await o.save();
                }
            }

            approvedCount++;
        }

        res.json({ message: `Successfully approved ${approvedCount} payouts.` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to approve payouts' });
    }
});

// @route   GET /api/employee/admin/finance/transactions
// @desc    Get all transactions (Ledger/History)
// @access  Private/Admin
router.get('/admin/finance/transactions', protect, checkModule('finance'), async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const txns = await Transaction.find(query)
            .populate('recipient', 'name businessName phone role')
            .sort({ createdAt: -1 })
            .lean();

        const formatted = txns.map(t => ({
            _id: t._id,
            transactionId: t.transactionId,
            recipientName: t.recipient?.businessName || t.recipient?.name || 'Unknown',
            recipientId: t.recipient?._id,
            partnerType: t.recipient?.role || t.module,
            module: t.module,
            amount: t.amount,
            type: t.type,
            paymentMode: t.paymentMode,
            status: t.status,
            date: t.createdAt
        }));

        res.json(formatted);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// @route   GET /api/employee/admin/search-users
// @desc    Search users/partners by name/phone/id
router.get('/admin/search-users', protect, checkModule('payout'), async (req, res) => {
    console.log('--- SEARCH HANDLER TRIGGERED ---');
    console.log('Query:', req.query.query);
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const isHexId = /^[0-9a-fA-F]{24}$/.test(query);
        let mongoQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { businessName: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } }
            ],
            role: { $in: ['farmer', 'machine_partner', 'labour', 'buyer', 'ksp', 'field_executive', 'equipment'] }
        };

        if (isHexId) {
            mongoQuery.$or.push({ _id: query });
        }

        const users = await User.find(mongoQuery)
            .select('name businessName phone role address walletBalance')
            .limit(20)
            .lean();

        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Search failed' });
    }
});

// @route   POST /api/employee/admin/process-payout
// @desc    Admin pays user/partner and deducts from wallet
router.post('/admin/process-payout', protect, checkModule('payout'), async (req, res) => {
    try {
        const { id, amount, note, utrNumber, paymentMode } = req.body;
        if (!id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid ID or amount' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const debitAmount = Number(amount);
        if ((user.walletBalance || 0) < debitAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        user.walletBalance -= debitAmount;
        await user.save();

        // Create Transaction audit log
        await Transaction.create({
            transactionId: 'PAY' + Date.now().toString().substring(6),
            recipient: id,
            module: 'Platform',
            amount: debitAmount,
            type: 'Payout',
            paymentMode: paymentMode || 'Bank Transfer',
            status: 'Completed',
            performedBy: req.user.id,
            note: note || (utrNumber ? `UTR: ${utrNumber}` : 'Admin manual payout')
        });

        res.json({ success: true, newBalance: user.walletBalance });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Payout processing failed' });
    }
});


// @route   PUT /api/employee/admin/finance/transactions/:id/status
// @desc    Update status of a transaction
// @access  Private/Admin
router.put('/admin/finance/transactions/:id/status', protect, checkModule('finance'), async (req, res) => {
    try {
        const { status, note, utrNumber } = req.body;
        if (!['Pending', 'Completed', 'Failed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const txn = await Transaction.findById(req.params.id);
        if (!txn) return res.status(404).json({ error: 'Transaction not found' });

        txn.status = status;
        if (note) txn.note = note;
        if (utrNumber && !note) txn.note = `UTR: ${utrNumber}`;

        await txn.save();
        res.json({ message: 'Transaction status updated successfully', transaction: txn });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update transaction status' });
    }
});

// @route   GET /api/employee/admin/finance/reconciliation
// @desc    Get financial reconciliation report (Cash In vs Cash Out)
// @access  Private/Admin
router.get('/admin/finance/reconciliation', protect, checkModule('finance'), async (req, res) => {
    try {
        let totalCashIn = 0;

        // 1. Completed Rentals Commission
        const rentals = await Rental.find({ status: 'Completed' }).lean();
        const equipmentCommission = rentals.reduce((sum, r) => sum + (r.platformCommission || 0), 0);
        totalCashIn += equipmentCommission;

        // 2. KSP Sales (approximate platform revenue share if needed, using total shop sales for now)
        const shopOrders = await ShopOrder.find({ status: { $ne: 'CANCELLED' } }).lean();
        const shopRevenue = shopOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        totalCashIn += shopRevenue;

        // Cash OUT: Completed Payouts
        const payouts = await Transaction.find({ status: 'Completed', type: 'Payout' }).lean();
        const totalCashOut = payouts.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Pending Obligations
        const pendingTransactions = await Transaction.find({ status: 'Pending', type: 'Payout' }).lean();
        const pendingObligations = pendingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        const netPosition = totalCashIn - totalCashOut;

        res.json({
            totalCashIn,
            breakdownIn: {
                equipmentCommission,
                shopRevenue
            },
            totalCashOut,
            pendingObligations,
            netPosition
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch reconciliation report' });
    }
});

// @route   GET /api/employee/admin/finance/export
// @desc    Export Transactions to CSV
// @access  Private/Admin
router.get('/admin/finance/export', protect, checkModule('finance'), async (req, res) => {
    try {
        const txns = await Transaction.find({ status: 'Completed' })
            .populate('recipient', 'name businessName phone role')
            .sort({ createdAt: -1 })
            .lean();

        let csv = '\uFEFF';
        csv += 'Transaction ID,Recipient Name,Partner Type,Module,Amount,Type,Payment Mode,Status,Date\n';

        const rows = txns.map(t => {
            const recipientName = t.recipient?.businessName || t.recipient?.name || 'Unknown';
            const partnerType = t.recipient?.role || t.module;
            return [
                escapeCSV(t.transactionId),
                escapeCSV(recipientName),
                escapeCSV(partnerType),
                escapeCSV(t.module),
                t.amount || 0,
                escapeCSV(t.type),
                escapeCSV(t.paymentMode),
                escapeCSV(t.status),
                new Date(t.createdAt).toLocaleDateString('en-GB')
            ].join(',');
        });

        csv += rows.join('\n');

        res.attachment('Finance_Transactions.csv');
        res.status(200).send(csv);
    } catch (e) {
        console.error('Finance export error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// @route   GET /api/employee/admin/analytics/overview
// @desc    Get aggregated business insights and performance metrics
// @access  Private/Admin
router.get('/admin/analytics/overview', protect, checkModule('analytics'), async (req, res) => {
    try {
        const { range = '30d' } = req.query;
        const now = new Date();
        const start = new Date();
        if (range === '7d') start.setDate(now.getDate() - 7);
        else start.setDate(now.getDate() - 30);

        // 1. Revenue Trends (Last 30 days)
        const transactions = await Transaction.find({
            status: 'Completed',
            createdAt: { $gte: start }
        }).sort({ createdAt: 1 }).lean();

        // Group by Date for Chart.js
        const revenueByDate = {};
        const labels = [];
        const dailyRevenue = [];

        // Pre-fill last 30 days with 0
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const key = d.toISOString().split('T')[0];
            revenueByDate[key] = 0;
            labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        }

        transactions.forEach(t => {
            const key = t.createdAt.toISOString().split('T')[0];
            if (revenueByDate[key] !== undefined) {
                revenueByDate[key] += t.amount;
            }
        });

        Object.keys(revenueByDate).sort().forEach(key => {
            dailyRevenue.push(revenueByDate[key]);
        });

        // 2. Module Contribution
        const moduleContrib = { Equipment: 0, Labour: 0, KSP: 0, BuyerTrading: 0 };
        transactions.forEach(t => {
            if (moduleContrib[t.module] !== undefined) {
                moduleContrib[t.module] += t.amount;
            }
        });

        // 3. Growth Metrics (Current Month vs Previous Month)
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const usersCount = await User.countDocuments({ role: { $ne: 'admin' } });
        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfThisMonth }, role: { $ne: 'admin' } });
        const newUsersLastMonth = await User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }, role: { $ne: 'admin' } });

        const revenueThisMonth = transactions.filter(t => t.createdAt >= startOfThisMonth).reduce((s, t) => s + t.amount, 0);
        const revenueLastMonth = await Transaction.aggregate([
            { $match: { status: 'Completed', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const growth = {
            revenue: calculateGrowth(revenueThisMonth, revenueLastMonth[0]?.total || 0),
            users: calculateGrowth(newUsersThisMonth, newUsersLastMonth),
            transactions: calculateGrowth(
                transactions.filter(t => t.createdAt >= startOfThisMonth).length,
                await Transaction.countDocuments({ status: 'Completed', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } })
            )
        };

        // 4. Quality Metrics & Top Performers (Dynamic fallback)
        const totalKYC = await User.countDocuments({ role: { $in: ['equipment', 'labour', 'ksp', 'shop'] } });
        const approvedKYC = await User.countDocuments({ role: { $in: ['equipment', 'labour', 'ksp', 'shop'] }, status: 'approved' });

        // Aggregate top performers by revenue
        const topPerformerAgg = await Transaction.aggregate([
            { $match: { status: 'Completed', createdAt: { $gte: start } } },
            { $group: { _id: { recipient: '$recipient', module: '$module' }, total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $lookup: { from: 'users', localField: '_id.recipient', foreignField: '_id', as: 'userDetails' } }
        ]);

        const getTop = (mod) => topPerformerAgg.find(p => p._id.module === mod)?.userDetails[0]?.name || 'N/A';

        res.json({
            charts: {
                revenue: { labels, data: dailyRevenue },
                contribution: {
                    labels: Object.keys(moduleContrib),
                    data: Object.values(moduleContrib)
                }
            },
            growth,
            performance: {
                topFranchise: getTop('KSP') !== 'N/A' ? getTop('KSP') : 'Krishi Seva Kendra',
                topEquipment: getTop('Equipment') !== 'N/A' ? getTop('Equipment') : 'Sharma Tractor',
                topBuyer: getTop('BuyerTrading') !== 'N/A' ? getTop('BuyerTrading') : 'Vikram Traders'
            },
            quality: {
                avgRating: 4.8,
                kycApprovalRate: totalKYC > 0 ? ((approvedKYC / totalKYC) * 100).toFixed(1) : 100,
                onTimeDelivery: 94.2
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Analytics failure' });
    }
});

// Helper for Growth Calculation
function calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
}

// @route   GET /api/employee/admin/analytics/report/:module
// @desc    Download module specific report
// @access  Private/Admin
router.get('/admin/analytics/report/:module', protect, checkModule('analytics'), async (req, res) => {
    try {
        const { module } = req.params;
        const { format = 'csv' } = req.query;
        let data = [];
        let csv = '\uFEFF';

        if (module === 'ksp') {
            data = await ShopOrder.find().populate('buyer', 'name phone').sort({ createdAt: -1 }).lean();
            csv += 'Order ID,Customer,Phone,Amount,Status,Date\n';
            data.forEach(o => {
                const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A';
                csv += `${o._id},"${o.buyer?.name || 'N/A'}","${o.buyer?.phone || 'N/A'}",${o.totalAmount},${o.status},${date}\n`;
            });
        } else if (module === 'equipment') {
            data = await Rental.find().populate('owner buyer', 'name').sort({ createdAt: -1 }).lean();
            csv += 'Rental ID,Owner,Buyer,Total Amount,Status,Date\n';
            data.forEach(r => {
                const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A';
                csv += `${r._id},"${r.owner?.name || 'N/A'}","${r.buyer?.name || 'N/A'}",${r.totalAmount},${r.status},${date}\n`;
            });
        } else if (module === 'labour') {
            data = await LabourJob.find().populate('labour', 'name').sort({ createdAt: -1 }).lean();
            csv += 'Job ID,Labour Name,Amount,Status,Date\n';
            data.forEach(l => {
                const date = l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A';
                csv += `${l._id},"${l.labour?.name || 'N/A'}",${l.amount},${l.status},${date}\n`;
            });
        } else if (module === 'buyer-trading') {
            data = await Order.find().populate('assignedTo', 'name').sort({ createdAt: -1 }).lean();
            csv += 'Order ID,Farmer,Buyer,Crop,Amount,Status,Date\n';
            data.forEach(o => {
                const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A';
                csv += `${o._id},"${o.farmerName || 'N/A'}","${o.assignedTo?.name || 'N/A'}","${o.crop}",${o.amount},${o.status},${date}\n`;
            });
        } else {
            // Consolidated / Finance
            data = await Transaction.find().populate('recipient', 'name').sort({ createdAt: -1 }).lean();
            csv += 'Txn ID,Recipient,Module,Amount,Type,Status,Date\n';
            data.forEach(t => {
                const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A';
                csv += `${t.transactionId},"${t.recipient?.name || 'N/A'}",${t.module},${t.amount},${t.type},${t.status},${date}\n`;
            });
        }

        if (format === 'json') {
            return res.status(200).json(data);
        }

        res.attachment(`KrishiNex_${module}_report.csv`);
        res.status(200).send(csv);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Report generation failed' });
    }
});

// Admin Dashboard Comprehensive Stats
router.get('/admin/dashboard-stats', protect, async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            kspCount, kspStockVal, kspSalesToday,
            eqPartners, eqMachines, eqActiveBookings,
            labRegistered, labActiveWorkers, labActiveJobs,
            buyTotal, buyOrders, buyPendingPay,
            soilLabs, soilTestsTotal, soilTestsMonth,
            farmerTotal, farmerActive, farmerWallet,
            staffTotal, fieldExTotal,
            todayRev, todayOrders, kycPending, payoutsPending,
            recentTransactions, recentShopOrders
        ] = await Promise.all([
            // 1. KSP
            User.countDocuments({ role: 'ksp' }),
            Item.aggregate([{ $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stockQty'] } } } }]),
            Transaction.aggregate([{ $match: { module: 'KSP', status: 'Completed', createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),

            // 2. Equipment
            User.countDocuments({ role: 'equipment' }),
            Machine.countDocuments(),
            Rental.countDocuments({ status: 'Accepted' }),

            // 3. Labour
            User.countDocuments({ role: 'labour' }),
            User.countDocuments({ role: 'labour', status: 'approved' }),
            LabourJob.countDocuments({ status: { $in: ['Accepted', 'In Progress'] } }),

            // 4. Buyer Trading (B2B)
            User.countDocuments({ role: 'buyer', businessName: { $exists: true, $ne: '' } }),
            Order.countDocuments(),
            Transaction.aggregate([{ $match: { module: 'BuyerTrading', status: 'Pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),

            // 5. Soil Testing
            User.countDocuments({ role: 'soil' }),
            SoilRequest.countDocuments(),
            SoilRequest.countDocuments({ createdAt: { $gte: startOfMonth } }),

            // 6. Farmers
            User.countDocuments({ role: 'buyer' }),
            User.countDocuments({ role: 'buyer', status: 'approved' }),
            User.aggregate([{ $match: { role: 'buyer', walletBalance: { $gte: -1000000, $lte: 100000000 } } }, { $group: { _id: null, total: { $sum: '$walletBalance' } } }]),

            // 7. Internal
            User.countDocuments({ role: { $in: ['employee', 'admin'] } }),
            User.countDocuments({ role: 'field_executive' }),

            // 8. Today's Key Metrics
            Transaction.aggregate([{ $match: { status: 'Completed', createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Order.countDocuments({ createdAt: { $gte: startOfToday } }),
            User.countDocuments({ status: 'pending' }),
            Transaction.aggregate([{ $match: { type: 'payout', status: 'Pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),

            // 9. Recent Activities
            Transaction.find().populate('recipient', 'name').sort({ createdAt: -1 }).limit(10).lean(),
            ShopOrder.find({ status: { $ne: 'CANCELLED' } }).populate('buyer', 'name').sort({ createdAt: -1 }).limit(10).lean()
        ]);

        const activities = [
            ...recentTransactions.map(t => ({
                type: t.module || t.type || 'Transaction',
                title: t.module ? `${t.module} ${t.type || ''}` : t.type || 'Activity',
                description: `${t.recipient?.name || 'User'} - ?${t.amount || 0}`,
                time: t.createdAt,
                status: t.status
            })),
            ...recentShopOrders.map(o => ({
                type: 'KSP',
                title: 'KSP Product Sale',
                description: `${o.buyer?.name || 'Farmer'} - ?${o.totalAmount || 0}`,
                time: o.createdAt,
                status: o.status
            }))
        ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10)
            .map(act => ({
                ...act,
                time: formatTimeAgo(act.time)
            }));

        res.status(200).json({
            ksp: { franchises: kspCount, stockValue: kspStockVal[0]?.total || 0, salesToday: kspSalesToday[0]?.total || 0 },
            equipment: { partners: eqPartners, machines: eqMachines, activeBookings: eqActiveBookings },
            labour: { registered: labRegistered, activeWorkers: labActiveWorkers, activeJobs: labActiveJobs },
            trading: { buyers: buyTotal, totalOrders: buyOrders, pendingPayment: buyPendingPay[0]?.total || 0 },
            soil: { labs: soilLabs, testsDone: soilTestsTotal, monthTests: soilTestsMonth },
            farmers: { total: farmerTotal, active: farmerActive, walletTotal: farmerWallet[0]?.total || 0 },
            internal: { staff: staffTotal, fieldEx: fieldExTotal, online: 12 },
            activities,
            metrics: {
                revenue: todayRev[0]?.total || 0,
                orders: todayOrders,
                kycPending: kycPending,
                payouts: payoutsPending[0]?.total || 0
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Dashboard stats failed' });
    }
});

function formatTimeAgo(date) {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}


// =============================================
// ADMIN: FRANCHISE (KSP) MANAGEMENT ROUTES
// =============================================

// @route   GET /api/employee/admin/franchise-stats
// @desc    Get KPI stats for Franchise dashboard
router.get('/admin/franchise-stats', protect, checkModule('ksp_franchise'), async (req, res) => {
    try {
        const totalFranchises = await User.countDocuments({ role: 'ksp' });
        const activeFranchises = await User.countDocuments({ role: 'ksp', status: 'approved' });
        const lowStockItems = await Item.countDocuments({ stockQty: { $lt: 10 } });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const sales = await FranchiseSale.find({ createdAt: { $gte: startOfMonth }, status: 'Completed' });
        const monthlySales = sales.reduce((sum, s) => sum + s.totalAmount, 0);

        const allFranchises = await User.find({ role: 'ksp' }).select('walletBalance');
        const totalWallet = allFranchises.reduce((sum, f) => sum + (f.walletBalance || 0), 0);

        res.json({
            totalFranchises,
            activeFranchises,
            monthlySales,
            totalStockValue: 0, // Placeholder
            lowStockCount: lowStockItems,
            totalWallet
        });
    } catch (e) {
        console.error('Franchise stats error:', e);
        res.status(500).json({ error: 'Failed to fetch franchise stats' });
    }
});

// @route   POST /api/employee/admin/franchises
// @desc    Add a new KSP franchise
router.post('/admin/franchises', protect, checkModule('ksp_franchise'), async (req, res) => {
    try {
        const { name, phone, email, password, businessName, address } = req.body;

        if (!name || !phone || !password || !businessName || !address) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const userExists = await User.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ error: 'User with this phone number already exists' });
        }

        const newFranchise = await User.create({
            name,
            phone,
            email: email || '',
            password,
            role: 'ksp',
            status: 'approved',
            businessName,
            address,
            walletBalance: 0
        });

        res.status(201).json({
            message: 'Franchise Created Successfully',
            franchiseId: newFranchise._id
        });
    } catch (e) {
        console.error('Franchise creation error:', e);
        res.status(500).json({ error: 'Failed to create franchise' });
    }
});

// @route   GET /api/employee/admin/franchises
// @desc    Get all franchises for admin
router.get('/admin/franchises', protect, checkModule('ksp_franchise'), async (req, res) => {
    try {
        const franchises = await User.find({ role: 'ksp' })
            .select('name businessName phone address status walletBalance walletNumber createdAt')
            .sort({ createdAt: -1 });

        const result = await Promise.all(franchises.map(async f => {
            const lowStockCount = await Item.countDocuments({ owner: f._id, stockQty: { $lt: 10 } });

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const sales = await FranchiseSale.find({ franchise: f._id, createdAt: { $gte: startOfMonth }, status: 'Completed' });
            const salesThisMonth = sales.reduce((sum, s) => sum + s.totalAmount, 0);

            return {
                _id: f._id,
                franchiseName: f.businessName || f.name,
                ownerName: f.name,
                phone: f.phone,
                location: f.address,
                status: f.status,
                walletBalance: f.walletBalance || 0,
                walletNumber: f.walletNumber || null,
                stockValue: 0, // Placeholder
                lowStockCount,
                salesThisMonth
            };
        }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   POST /api/employee/admin/ksp/direct-recharge
// @desc    Admin directly recharges a KSP wallet
router.post('/admin/ksp/direct-recharge', protect, checkAdmin, async (req, res) => {
    try {
        const { id, amount, note } = req.body;
        if (!id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid ID or amount' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.walletBalance = (user.walletBalance || 0) + Number(amount);
        await user.save();

        // Create transaction record
        await Transaction.create({
            transactionId: 'RECH' + Date.now().toString().substring(6),
            recipient: id,
            module: 'KSP',
            amount: Number(amount),
            type: 'Credit',
            paymentMode: 'Cash',
            status: 'Completed',
            performedBy: req.user._id,
            note: note || 'Direct admin recharge'
        });

        res.json({ success: true, newBalance: user.walletBalance });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Recharge failed' });
    }
});

// @route   GET /api/employee/admin/ksp/transactions/:id
// @desc    Get all transactions (Sales & Recharges) for a franchise
router.get('/admin/ksp/transactions/:id', protect, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Wallet Transactions (Recharges/Payouts)
        const txns = await Transaction.find({ recipient: id, module: 'KSP' }).sort({ createdAt: -1 }).lean();

        // 2. Get Sales History
        const sales = await FranchiseSale.find({ franchise: id }).sort({ createdAt: -1 }).lean();

        // Combine and sort
        const combined = [
            ...txns.map(t => ({
                id: t._id,
                date: t.createdAt,
                type: 'Recharge',
                amount: t.amount,
                status: t.status,
                note: t.note || t.paymentMode
            })),
            ...sales.map(s => ({
                id: s._id,
                date: s.createdAt,
                type: 'Sale',
                amount: s.totalAmount,
                status: s.status,
                note: `Order: ${s.items.length} items`
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(combined);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// @route   GET /api/employee/admin/franchise/inventory
// @desc    Get inventory for all or specific franchise
router.get('/admin/franchise/inventory', protect, checkAdmin, async (req, res) => {
    try {
        const { kspId } = req.query;
        let query = {};
        if (kspId && kspId !== 'all') query.owner = kspId;
        else {
            const franchises = await User.find({ role: 'ksp' }).select('_id');
            query.owner = { $in: franchises.map(f => f._id) };
        }

        const items = await Item.find(query).populate('owner', 'name businessName').sort({ stockQty: 1 });
        const result = items.map(i => ({
            _id: i._id,
            name: i.name,
            category: i.category,
            stockQty: i.stockQty,
            unit: i.unit,
            ownerName: i.owner ? (i.owner.businessName || i.owner.name) : 'Unknown'
        }));
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   GET /api/employee/admin/franchise/ledger
// @desc    Get sales ledger for all or specific payment mode
router.get('/admin/franchise/ledger', protect, checkAdmin, async (req, res) => {
    try {
        const { paymentMode } = req.query;
        let query = {};
        if (paymentMode && paymentMode !== 'all') {
            query.paymentMode = paymentMode === 'cash' ? 'Cash' : 'NexCard Wallet';
        }

        const sales = await FranchiseSale.find(query)
            .populate('franchise', 'name businessName')
            .populate('buyer', 'name phone')
            .sort({ createdAt: -1 })
            .limit(100);

        const result = sales.map(s => ({
            _id: s.saleId,
            farmerName: s.buyerName || (s.buyer ? s.buyer.name : 'Unknown'),
            products: s.items.map(it => `${it.name} (${it.quantity})`).join(', '),
            totalAmount: s.totalAmount,
            paymentMode: s.paymentMode.toUpperCase(),
            franchiseName: s.franchise ? (s.franchise.businessName || s.franchise.name) : 'Unknown',
            date: s.createdAt
        }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   GET /api/employee/admin/franchise/wallets
// @desc    Get wallet balances and recharge requests
router.get('/admin/franchise/wallets', protect, checkAdmin, async (req, res) => {
    try {
        const franchises = await User.find({ role: 'ksp' })
            .select('name businessName address walletBalance walletRechargeAmount walletRechargeStatus')
            .sort({ walletRechargeStatus: -1 });

        const result = franchises.map(f => ({
            _id: f._id,
            franchiseName: f.businessName || f.name,
            location: f.address,
            walletBalance: f.walletBalance || 0,
            rechargeRequest: f.walletRechargeAmount || 0,
            requestStatus: f.walletRechargeStatus || 'NONE'
        }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   PUT /api/employee/admin/franchise/approve-wallet/:id
// @desc    Approve wallet recharge for franchise
router.put('/admin/franchise/approve-wallet/:id', protect, checkAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Franchise not found' });

        if (user.walletRechargeStatus !== 'PENDING') {
            return res.status(400).json({ error: 'No pending recharge request' });
        }

        const amount = user.walletRechargeAmount || 0;
        user.walletBalance = (user.walletBalance || 0) + amount;
        user.walletRechargeStatus = 'APPROVED';
        user.walletRechargeAmount = 0;
        await user.save();

        // Transaction record
        await Transaction.create({
            transactionId: `KSP-RECH-${Date.now()}`,
            recipient: user._id,
            module: 'KSP',
            amount: amount,
            type: 'Credit',
            paymentMode: 'Cash',
            status: 'Completed',
            note: 'Franchise Wallet Recharge Approved by Admin'
        });

        res.json({ message: `Recharge of ₹${amount} approved successfully` });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// @route   POST /api/employee/leads/generate
// @desc    Generate a new marketing lead (Farmer/Shop)
// @access  Private (Employee/Field Executive)
router.post('/leads/generate', protect, uploadLeadPhoto.single('photo'), async (req, res) => {
    try {
        const { category, mobile, address, farmerDetails, shopDetails } = req.body;
        
        if (!category || !mobile || !address) {
            return res.status(400).json({ error: 'Category, Mobile and Address are required' });
        }

        const leadData = {
            executive: req.user.id,
            category,
            mobile,
            address,
            photoUrl: req.file ? `uploads/${req.file.filename}` : ''
        };

        if (category === 'Kisan') {
            leadData.farmerDetails = typeof farmerDetails === 'string' ? JSON.parse(farmerDetails) : farmerDetails;
        } else {
            leadData.shopDetails = typeof shopDetails === 'string' ? JSON.parse(shopDetails) : shopDetails;
        }

        const lead = new FieldLead(leadData);
        await lead.save();

        res.json({ message: 'Lead generated successfully', lead });
    } catch (error) {
        console.error('Lead generate error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// @route   GET /api/employee/admin/leads
// @desc    Get all marketing leads for admin
// @access  Private/Admin
router.get('/admin/leads', protect, checkAdmin, async (req, res) => {
    try {
        const leads = await FieldLead.find()
            .populate('executive', 'name employeeCode')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

module.exports = router;
