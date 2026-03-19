const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Chat, Message } = require('../models/Chat');
const SoilRequest = require('../models/SoilRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Transaction = require('../models/Transaction');

// @route   GET /api/user/wallet
// @desc    Get user wallet balance, number and transactions
// @access  Private
router.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance walletNumber cardNumber name');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            balance: user.walletBalance || 0,
            walletNumber: user.walletNumber || '',
            cardNumber: user.cardNumber || '',
            name: user.name || '',
            transactions
        });
    } catch (error) {
        console.error('Fetch wallet error:', error);
        res.status(500).json({ error: 'Server error fetching wallet' });
    }
});

// @route   PUT /api/user/wallet/number
// @desc    Update user wallet/card number
// @access  Private
router.put('/wallet/number', protect, async (req, res) => {
    try {
        const { walletNumber } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.walletNumber = walletNumber;
        await user.save();

        res.json({ message: 'Wallet number updated', walletNumber: user.walletNumber });
    } catch (error) {
        console.error('Update wallet number error:', error);
        res.status(500).json({ error: 'Server error updating wallet number' });
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `aadhaar_${req.user.id}_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
});

// Multer config for profile photos (images only)
const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `photo_${req.user.id}_${Date.now()}${ext}`);
    }
});
const uploadPhoto = multer({
    storage: photoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, WEBP files are allowed'));
    }
});

// @route   GET /api/user/profile
// @desc    Get logged in user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                address: user.address,
                businessName: user.businessName,
                aadhaarNumber: user.aadhaarNumber,
                aadhaarDocUrl: user.aadhaarDocUrl,
                profilePhotoUrl: user.profilePhotoUrl || '',
                status: user.status,
                employeeModules: user.employeeModules || [],
                employeeCode: user.employeeCode || 'N/A',
                createdAt: user.createdAt,
                maxDistanceKm: user.maxDistanceKm,
                ratePerDay: user.ratePerDay,
                ratePerHour: user.ratePerHour,
                jobNotificationOn: user.jobNotificationOn,
                whatsappOn: user.whatsappOn,
                panNumber: user.panNumber || '',
                panDocUrl: user.panDocUrl || '',
                bankDetails: user.bankDetails || {
                    holderName: '',
                    bankName: '',
                    accountNumber: '',
                    ifscCode: '',
                    bankAddress: ''
                },
                skills: user.labourDetails?.skills || []
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email && req.body.email.trim() !== '' ? req.body.email : user.email;
            user.address = req.body.address || user.address;
            user.businessName = req.body.businessName || user.businessName;
            if (req.body.aadhaarNumber && user.status === 'approved') {
                return res.status(403).json({ error: 'Verified Aadhaar cannot be changed' });
            }
            user.aadhaarNumber = req.body.aadhaarNumber || user.aadhaarNumber;

            if (req.body.maxDistanceKm !== undefined) user.maxDistanceKm = req.body.maxDistanceKm;
            if (req.body.ratePerDay !== undefined) user.ratePerDay = req.body.ratePerDay;
            if (req.body.ratePerHour !== undefined) user.ratePerHour = req.body.ratePerHour;
            if (req.body.jobNotificationOn !== undefined) user.jobNotificationOn = req.body.jobNotificationOn;
            if (req.body.whatsappOn !== undefined) user.whatsappOn = req.body.whatsappOn;

            // Handle labour skills
            if (user.role === 'labour' && req.body.skills !== undefined) {
                if (!user.labourDetails) user.labourDetails = { skills: [] };
                user.labourDetails.skills = Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills];
                user.markModified('labourDetails');
            }

            // Update bank details
            if (req.body.bankDetails) {
                if (!user.bankDetails) {
                    user.bankDetails = {};
                }
                const b = req.body.bankDetails;
                if (b.holderName !== undefined) user.bankDetails.holderName = b.holderName;
                if (b.bankName !== undefined) user.bankDetails.bankName = b.bankName;
                if (b.accountNumber !== undefined) user.bankDetails.accountNumber = b.accountNumber;
                if (b.ifscCode !== undefined) user.bankDetails.ifscCode = b.ifscCode;
                if (b.bankAddress !== undefined) user.bankDetails.bankAddress = b.bankAddress;

                // Explicitly mark as modified for nested object
                user.markModified('bankDetails');
            }

            if (req.body.panNumber !== undefined) user.panNumber = req.body.panNumber;

            // Handle location update
            if (req.body.lat !== undefined && req.body.lng !== undefined) {
                user.location = {
                    type: 'Point',
                    coordinates: [Number(req.body.lng), Number(req.body.lat)]
                };
                user.markModified('location');
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                address: updatedUser.address,
                businessName: updatedUser.businessName,
                aadhaarNumber: updatedUser.aadhaarNumber,
                aadhaarDocUrl: updatedUser.aadhaarDocUrl,
                status: updatedUser.status,
                maxDistanceKm: updatedUser.maxDistanceKm,
                ratePerDay: updatedUser.ratePerDay,
                ratePerHour: updatedUser.ratePerHour,
                jobNotificationOn: updatedUser.jobNotificationOn,
                whatsappOn: updatedUser.whatsappOn,
                bankDetails: updatedUser.bankDetails,
                panNumber: updatedUser.panNumber,
                skills: updatedUser.labourDetails?.skills || [],
                message: 'Profile updated successfully'
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// @route   GET /api/user/bank-details
// @desc    Get user bank details
// @access  Private
router.get('/bank-details', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('bankDetails');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.bankDetails || {
            holderName: '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            bankAddress: ''
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/user/bank-details
// @desc    Update user bank details
// @access  Private
router.put('/bank-details', protect, async (req, res) => {
    console.log('--- PUT /api/user/bank-details hit ---');
    console.log('User ID:', req.user.id);
    console.log('Body:', req.body);
    try {
        const { holderName, bankName, accountNumber, ifscCode, bankAddress } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const b = user.bankDetails || {};
        user.bankDetails = {
            holderName: holderName !== undefined ? holderName : b.holderName || '',
            bankName: bankName !== undefined ? bankName : b.bankName || '',
            accountNumber: accountNumber !== undefined ? accountNumber : b.accountNumber || '',
            ifscCode: ifscCode !== undefined ? ifscCode : b.ifscCode || '',
            bankAddress: bankAddress !== undefined ? bankAddress : b.bankAddress || ''
        };

        user.markModified('bankDetails');
        await user.save();
        res.json({ message: 'Bank details updated successfully', bankDetails: user.bankDetails });
    } catch (error) {
        console.error('Update bank details error:', error);
        res.status(500).json({ error: 'Server error updating bank details' });
    }
});

// @route   POST /api/user/upload-aadhaar
// @desc    Upload Aadhaar document (image or PDF)
// @access  Private
router.post('/upload-aadhaar', protect, upload.single('aadhaar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Verified Aadhaar document cannot be changed' });
        }

        const fileUrl = `uploads/${req.file.filename}`;

        user.aadhaarDocUrl = fileUrl;
        await user.save();

        res.json({ message: 'Aadhaar document uploaded successfully', url: fileUrl });
    } catch (error) {
        console.error('Aadhaar upload error:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

// @route   POST /api/user/upload-pan
// @desc    Upload PAN document
// @access  Private
router.post('/upload-pan', protect, upload.single('pan'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `uploads/${req.file.filename}`;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.panDocUrl = fileUrl;
        await user.save();
        res.json({ message: 'PAN document uploaded successfully', url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'PAN upload failed' });
    }
});

// @route   POST /api/user/upload-license
// @desc    Upload Business License document
// @access  Private
router.post('/upload-license', protect, upload.single('license'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `uploads/${req.file.filename}`;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.businessLicenseUrl = fileUrl;
        await user.save();
        res.json({ message: 'Business license uploaded successfully', url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'License upload failed' });
    }
});

// @route   POST /api/user/upload-photo
// @desc    Upload profile photo
// @access  Private
router.post('/upload-photo', protect, uploadPhoto.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `uploads/${req.file.filename}`;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.profilePhotoUrl = fileUrl;
        await user.save();

        res.json({ message: 'Photo uploaded successfully', url: fileUrl });
    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

// ============ DOCTOR CHAT ROUTES (FARMER SIDE) ============

// @route   GET /api/user/doctor-chats
// @desc    Get all doctor chat rooms for this farmer
// @access  Private
router.get('/doctor-chats', protect, async (req, res) => {
    try {
        const chats = await Chat.find({ farmer: req.user.id })
            .populate('doctor', 'name phone')
            .sort({ lastTime: -1 });
        res.json(chats);
    } catch (e) {
        console.error('Fetch farmer chats error:', e);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// @route   POST /api/user/doctor-chats/init
// @desc    Initialize a chat room for farmer. Assigns an available doctor.
// @access  Private
router.post('/doctor-chats/init', protect, async (req, res) => {
    console.log('--- POST /api/user/doctor-chats/init hit by user:', req.user.id);
    try {
        // Find existing chat first
        let chat = await Chat.findOne({ farmer: req.user.id });
        if (chat) {
            return res.json(chat);
        }

        // Assign to a doctor employee (prefer doctor module, fallback to any approved employee)
        let doctor = await User.findOne({ role: 'employee', employeeModules: 'doctor', status: 'approved' });
        if (!doctor) {
            doctor = await User.findOne({ role: 'employee', status: 'approved' });
        }
        if (!doctor) {
            // Last resort: find any admin user
            doctor = await User.findOne({ role: 'admin' });
        }
        if (!doctor) {
            return res.status(503).json({ error: 'No doctors available right now. Please try again later.' });
        }

        chat = new Chat({
            farmer: req.user.id,
            doctor: doctor._id,
            cropName: 'General Consultation'
        });
        await chat.save();
        res.json(chat);
    } catch (e) {
        console.error('Chat init error:', e);
        res.status(500).json({ error: 'Failed to initialize chat' });
    }
});

// Configure multer for Chat uploads (Farmer App)
const chatStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadChatMediaUser = multer({ storage: chatStorage });

// @route   POST /api/user/upload-chat-media
// @desc    Upload image or audio for chat
// @access  Private
router.post('/upload-chat-media', protect, uploadChatMediaUser.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fileUrl = `uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (e) {
        console.error('Chat media upload error:', e);
        res.status(500).json({ error: 'Upload failed' });
    }
});


// @route   GET /api/user/doctor-chats/:id/messages
// @desc    Get all messages in a chat room
// @access  Private
router.get('/doctor-chats/:id/messages', protect, async (req, res) => {
    try {
        const msgs = await Message.find({ chat: req.params.id })
            .sort({ createdAt: 1 });

        // Mark as read by farmer
        await Chat.findByIdAndUpdate(req.params.id, { unreadByFarmer: 0 });

        res.json(msgs);
    } catch (e) {
        console.error('Fetch farmer messages error:', e);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// @route   POST /api/user/doctor-chats/:id/messages
// @desc    Send a message to the doctor
// @access  Private
router.post('/doctor-chats/:id/messages', protect, async (req, res) => {
    try {
        const { text, mediaUrl, mediaType, audioDuration } = req.body;
        if (!text && !mediaUrl) return res.status(400).json({ error: 'Empty message' });

        const chat = await Chat.findOne({ _id: req.params.id, farmer: req.user.id });
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        // Do not allow sending if chat is blocked
        if (chat.isBlocked) {
            return res.status(403).json({ error: 'Cannot send message to blocked chat' });
        }

        const msg = new Message({
            chat: req.params.id,
            sender: req.user.id,
            text: (text || '').trim(),
            mediaUrl: mediaUrl || '',
            mediaType: mediaType || '',
            audioDuration: audioDuration || 0,
            fromDoctor: false
        });
        await msg.save();

        // Update chat's last message and unread count
        chat.lastMessage = (text || '').trim() || (mediaType === 'audio' ? 'Voice Message' : 'Image');
        chat.lastTime = new Date();
        chat.unreadByDoctor = (chat.unreadByDoctor || 0) + 1;
        await chat.save();

        // ** CREATE NOTIFICATION FOR THE DOCTOR **
        // Find farmer details to show in notification
        const farmer = await User.findById(req.user.id);
        const farmerName = farmer ? farmer.name : 'Farmer';

        const notificationMsg = (text || '').trim() || (mediaType === 'audio' ? '🎤 Voice Message' : '📷 Image');

        await Notification.create({
            user: chat.doctor, // Notify the doctor
            title: `New Message from ${farmerName}`,
            messageHi: `किसान ${farmerName} का नया संदेश: ${notificationMsg}`,
            messageEn: `New message from ${farmerName}: ${notificationMsg}`,
            type: 'system',
            refId: chat._id.toString()
        });

        res.json(msg);
    } catch (e) {
        console.error('Send farmer message error:', e);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ============ SOIL TESTING ROUTES (FARMER SIDE) ============

// @route   GET /api/user/soil-labs
// @desc    Get all approved soil labs (employees with 'soil' module)
// @access  Private
router.get('/soil-labs', protect, async (req, res) => {
    try {
        const labs = await User.find({
            $or: [
                { role: 'soil' },
                { role: 'employee', employeeModules: 'soil' }
            ],
            status: 'approved'
        }).select('name businessName phone address profilePhotoUrl');
        res.json(labs);
    } catch (e) {
        console.error('Fetch soil labs error:', e);
        res.status(500).json({ error: 'Failed to fetch soil labs' });
    }
});

// @route   POST /api/user/soil-requests
// @desc    Book a soil test
// @access  Private
router.post('/soil-requests', protect, async (req, res) => {
    try {
        const { labId, cropName, sampleType, visitType, testType } = req.body;
        if (!labId) return res.status(400).json({ error: 'Please select a lab' });

        const request = new SoilRequest({
            farmer: req.user.id,
            lab: labId,
            cropName: cropName || '',
            sampleType: sampleType || 'Field Soil',
            visitType: visitType || 'I will visit lab',
            testType: testType || 'NPK',
            status: 'New'
        });

        await request.save();

        // Notify the Lab Employee
        await Notification.create({
            user: labId,
            title: 'New Soil Test Request',
            titleHi: 'नया मिट्टी जांच अनुरोध',
            titleEn: 'New Soil Test Request',
            messageHi: `किसान ${req.user.name} ने मिट्टी जांच बुक की है।`,
            messageEn: `Farmer ${req.user.name} has booked a soil test.`,
            type: 'system',
            refId: request._id.toString()
        });

        res.json(request);
    } catch (e) {
        console.error('Create soil request error:', e);
        res.status(500).json({ error: 'Failed to book soil test' });
    }
});

// @route   GET /api/user/soil-requests
// @desc    Get history of soil test requests for this farmer
// @access  Private
router.get('/soil-requests', protect, async (req, res) => {
    try {
        const requests = await SoilRequest.find({ farmer: req.user.id })
            .populate('lab', 'name businessName phone address')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (e) {
        console.error('Fetch my soil requests error:', e);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
});

module.exports = router;

