const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FieldTask = require('../models/FieldTask');
const { protect, checkAdmin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Helper to generate IDs
const generateId = (prefix, number) => {
    return `${prefix}${String(number).padStart(3, '0')}`;
};

// @route   GET /api/field/dashboard
// @desc    Get Key Performance Indicators for Field Executives
// @access  Private/Admin
router.get('/dashboard', protect, checkAdmin, async (req, res) => {
    try {
        const executivesCount = await User.countDocuments({ role: 'field_executive' });

        const tasks = await FieldTask.find();

        const assignedTasks = tasks.length;
        const pendingTasks = tasks.filter(t => t.status === 'Pending').length;

        // Use a simple check for this month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const completedThisMonth = tasks.filter(t =>
            t.status === 'Completed' && new Date(t.updatedAt) >= firstDayOfMonth
        ).length;

        // Collections
        const collections = tasks.filter(t => t.taskType === 'Cash Collection');
        const totalCollections = collections
            .filter(t => t.status === 'Completed')
            .reduce((sum, task) => sum + task.amount, 0);

        const pendingDeposits = collections.filter(t => t.status === 'Pending').length;

        res.json({
            totalExecutives: executivesCount,
            assignedTasks,
            pendingTasks,
            completedThisMonth,
            totalCollections,
            pendingDeposits
        });
    } catch (error) {
        console.error('Error fetching field dashboard:', error);
        res.status(500).json({ error: 'Server error fetching dashboard' });
    }
});

// @route   GET /api/field/executives
// @desc    Get all Field Executives with their task stats
// @access  Private/Admin
router.get('/executives', protect, checkAdmin, async (req, res) => {
    try {
        const executives = await User.find({ role: 'field_executive' })
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .lean();

        // Attach stats for each executive
        const enrichedExecutives = await Promise.all(executives.map(async (exec) => {
            const tasks = await FieldTask.find({ executive: exec._id });

            const activeTasks = tasks.filter(t => t.status === 'Pending').length;
            const completed = tasks.filter(t => t.status === 'Completed').length;
            const collections = tasks
                .filter(t => t.taskType === 'Cash Collection' && t.status === 'Completed')
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                ...exec,
                activeTasks,
                completed,
                collections
            };
        }));

        res.json(enrichedExecutives);
    } catch (error) {
        console.error('Error fetching field executives:', error);
        res.status(500).json({ error: 'Server error fetching executives' });
    }
});

// @route   POST /api/field/executives/create
// @desc    Create a new Field Executive
// @access  Private/Admin
router.get('/test', (req, res) => res.json({ msg: 'Field routes working' }));

router.post('/executives/create', protect, checkAdmin, async (req, res) => {
    try {
        const { name, phone, email, assignedArea, password, employeeCode } = req.body;

        if (!name || !phone || !assignedArea || !password) {
            return res.status(400).json({ error: 'Name, phone, assigned area, and password are required' });
        }

        // Check for existing phone or code
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        if (employeeCode) {
            const existingCode = await User.findOne({ employeeCode });
            if (existingCode) {
                return res.status(400).json({ error: 'Executive ID (employeeCode) already exists' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newExecutive = new User({
            name,
            phone,
            email,
            password: hashedPassword,
            role: 'field_executive',
            assignedArea,
            employeeCode,
            status: 'approved', // Auto approve
            address: assignedArea // default to assigned area
        });

        await newExecutive.save();

        res.status(201).json({ message: 'Field Executive created successfully', executive: newExecutive });
    } catch (error) {
        console.error('Error creating field executive:', error);
        res.status(500).json({ error: 'Server error creating executive' });
    }
});

// @route   GET /api/field/tasks
// @desc    Get all tasks
// @access  Private/Admin
router.get('/tasks', protect, checkAdmin, async (req, res) => {
    try {
        const tasks = await FieldTask.find()
            .populate('executive', 'name employeeCode phone')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Server error fetching tasks' });
    }
});

// @route   POST /api/field/tasks/assign
// @desc    Assign a new task to an executive
// @access  Private/Admin
router.post('/tasks/assign', protect, checkAdmin, async (req, res) => {
    try {
        const { executiveId, taskType, partnerName, location, amount, dueDate, notes } = req.body;

        if (!executiveId || !taskType || !partnerName || !location) {
            return res.status(400).json({ error: 'Executive, Task Type, Partner Name, and Location are required' });
        }

        // Generate Task ID
        const taskCount = await FieldTask.countDocuments();
        const newTaskId = generateId('TASK-', taskCount + 1);

        const newTask = new FieldTask({
            executive: executiveId,
            taskId: newTaskId,
            taskType,
            partnerName,
            location,
            amount: amount || 0,
            dueDate,
            notes
        });

        await newTask.save();

        // Populate for immediate return
        const populatedTask = await FieldTask.findById(newTask._id).populate('executive', 'name employeeCode');

        res.status(201).json({ message: 'Task assigned successfully', task: populatedTask });
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ error: 'Server error assigning task' });
    }
});

module.exports = router;
