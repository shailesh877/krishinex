const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FieldTask = require('../models/FieldTask');
const FieldLead = require('../models/FieldLead');
const Transaction = require('../models/Transaction');
const { protect, checkAdmin, checkModule } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Helper to generate IDs
const generateId = (prefix, number) => {
    return `${prefix}${String(number).padStart(3, '0')}`;
};

// @route   GET /api/field/dashboard
// @desc    Get Key Performance Indicators for Field Executives
// @access  Private/Admin
router.get('/dashboard', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { startDate, endDate, all } = req.query;
        const executivesCount = await User.countDocuments({ role: 'field_executive' });

        let taskQuery = {};
        if (all !== 'true' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            taskQuery.createdAt = { $gte: start, $lte: end };
        }

        const tasks = await FieldTask.find(taskQuery);

        const assignedTasks = tasks.length;
        const pendingTasks = tasks.filter(t => t.status === 'Pending').length;

        // Use selected date range for completed counts, fallback to current month if all time
        let completedThisMonth;
        if (all !== 'true' && startDate && endDate) {
            completedThisMonth = tasks.filter(t => t.status === 'Completed').length;
        } else {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            completedThisMonth = tasks.filter(t =>
                t.status === 'Completed' && new Date(t.updatedAt) >= firstDayOfMonth
            ).length;
        }

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
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   GET /api/field/executives
// @desc    Get all Field Executives with their task stats
// @access  Private/Admin
router.get('/executives', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { startDate, endDate, all } = req.query;
        let query = { role: 'field_executive' };
        if (all !== 'true' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const executives = await User.find(query)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .lean();

        // Attach stats for each executive
        const enrichedExecutives = await Promise.all(executives.map(async (exec) => {
            let taskQuery = { executive: exec._id };
            if (all !== 'true' && startDate && endDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                taskQuery.createdAt = { $gte: start, $lte: end };
            }
            const tasks = await FieldTask.find(taskQuery);

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
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   POST /api/field/executives/create
// @desc    Create a new Field Executive
// @access  Private/Admin
router.get('/test', (req, res) => res.json({ msg: 'Field routes working' }));

router.post('/executives/create', protect, checkModule("field_executive"), async (req, res) => {
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
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   GET /api/field/tasks
// @desc    Get all tasks
// @access  Private/Admin
router.get('/tasks', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { startDate, endDate, all, search, status } = req.query;
        let andConditions = [];

        if (all !== 'true' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            andConditions.push({
                createdAt: { $gte: start, $lte: end }
            });
        }

        if (status && status !== 'All' && status !== '') {
            andConditions.push({ status: status });
        }

        if (search && search.trim() !== '') {
            const s = search.trim();
            const matchingExecs = await User.find({
                role: 'employee',
                name: { $regex: s, $options: 'i' }
            }).select('_id');
            const execIds = matchingExecs.map(e => e._id);
            
            andConditions.push({
                $or: [
                    { taskId: { $regex: s, $options: 'i' } },
                    { partnerName: { $regex: s, $options: 'i' } },
                    { executive: { $in: execIds } }
                ]
            });
        }

        let query = andConditions.length > 0 ? { $and: andConditions } : {};
        const tasks = await FieldTask.find(query)
            .populate('executive', 'name employeeCode phone')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   POST /api/field/tasks/assign
// @desc    Assign a new task to an executive
// @access  Private/Admin
router.post('/tasks/assign', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { executiveId, taskType, partnerName, location, mobileNumber, amount, dueDate, notes } = req.body;

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
            mobileNumber,
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
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   GET /api/field/tasks/:id
// @desc    Get single task details
// @access  Private
router.get('/tasks/:id', protect, async (req, res) => {
    try {
        const task = await FieldTask.findById(req.params.id).populate('executive', 'name employeeCode phone');
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        // Ensure only the assigned executive or an admin can view details
        if (req.user.role !== 'admin' && task.executive._id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(task);
    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   PATCH /api/field/tasks/:id/status
// @desc    Update task status
// @access  Private
router.patch('/tasks/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Accepted', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const task = await FieldTask.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Ensure only the assigned executive or an admin can update
        if (req.user.role !== 'admin' && task.executive.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const oldStatus = task.status;
        task.status = status;
        await task.save();

        // If a Cash Collection task was just marked Completed, add amount to executive's collectedCash
        if (oldStatus !== 'Completed' && status === 'Completed') {
            if (task.taskType === 'Cash Collection' && task.amount > 0) {
                const User = require('../models/User');
                const execUser = await User.findById(task.executive);
                if (execUser) {
                    execUser.collectedCash = (execUser.collectedCash || 0) + task.amount;
                    await execUser.save();
                }
            }
        }

        res.json({ message: `Task marked as ${status}`, task });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   PATCH /api/field/executives/:id
// @desc    Edit a Field Executive's details
// @access  Private/Admin
router.patch('/executives/:id', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { name, phone, email, assignedArea, employeeCode } = req.body;

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'field_executive') {
            return res.status(404).json({ error: 'Field Executive not found' });
        }

        // Check if phone or employeeCode already exists for a different user
        if (phone && phone !== user.phone) {
            const existingPhone = await User.findOne({ phone, _id: { $ne: user._id } });
            if (existingPhone) {
                return res.status(400).json({ error: 'Phone number already registered to another user' });
            }
        }

        if (employeeCode && employeeCode !== user.employeeCode) {
            const existingCode = await User.findOne({ employeeCode, _id: { $ne: user._id } });
            if (existingCode) {
                return res.status(400).json({ error: 'Executive ID already exists for another user' });
            }
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (email !== undefined) user.email = email;
        if (assignedArea) {
            user.assignedArea = assignedArea;
            user.address = assignedArea;
        }
        if (employeeCode !== undefined) user.employeeCode = employeeCode;

        await user.save();

        res.json({ message: 'Executive updated successfully', executive: user });
    } catch (error) {
        console.error('Error updating executive:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   PATCH /api/field/executives/:id/status
// @desc    Activate/Deactivate a Field Executive
// @access  Private/Admin
router.patch('/executives/:id/status', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'blocked'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use approved or blocked.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'field_executive') {
            return res.status(404).json({ error: 'Field Executive not found' });
        }

        user.status = status;
        await user.save();

        res.json({ message: `Executive status updated to ${status}`, status: user.status });
    } catch (error) {
        console.error('Error updating executive status:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

// @route   GET /api/field/executives/:id/performance
// @desc    Get 360-degree performance data for an executive
// @access  Private/Admin
router.get('/executives/:id/performance', protect, checkModule("field_executive"), async (req, res) => {
    try {
        const execId = req.params.id;
        const { startDate, endDate, all } = req.query;

        // 1. Basic Info & User Check
        const executive = await User.findById(execId).select('-password');
        if (!executive || executive.role !== 'field_executive') {
            return res.status(404).json({ error: 'Field Executive not found' });
        }

        let taskQuery = { executive: execId };
        let rechargeQuery = {
            performedBy: execId,
            type: 'Credit',
            paymentMode: 'Cash'
        };
        let leadQuery = { executive: execId };

        if (all !== 'true' && startDate && endDate) {
            const dateRange = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
            taskQuery.createdAt = dateRange;
            rechargeQuery.createdAt = dateRange;
            leadQuery.createdAt = dateRange;
        }

        // 2. Fetch Tasks (Assigned vs Completed)
        const tasks = await FieldTask.find(taskQuery).sort({ createdAt: -1 });

        // 3. Fetch Recharge history (from Transaction model)
        const recharges = await Transaction.find(rechargeQuery)
            .populate('recipient', 'name phone animate')
            .sort({ createdAt: -1 });

        // 4. Fetch Leads history
        const leads = await FieldLead.find(leadQuery).sort({ createdAt: -1 });

        res.json({
            executive,
            tasks,
            recharges,
            leads,
            stats: {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(t => t.status === 'Completed').length,
                pendingTasks: tasks.filter(t => t.status === 'Pending').length,
                totalCollections: tasks
                    .filter(t => t.taskType === 'Cash Collection' && t.status === 'Completed')
                    .reduce((sum, t) => sum + t.amount, 0),
                leadsGenerated: leads.length
            }
        });
    } catch (error) {
        console.error('Error fetching executive performance:', error);
        res.status(500).json({ error: 'Network issue. Please try again later.' });
    }
});

module.exports = router;
