const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Chat, Message } = require('../models/Chat');
const SoilRequest = require('../models/SoilRequest');
const Notification = require('../models/Notification');
const { protect, checkAdmin, checkModule } = require('../middleware/authMiddleware');
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
                gstNumber: user.gstNumber || 'TEST-999-GST',
                licenseNumber: user.licenseNumber || 'TEST-000-LIC',
                businessLicenseUrl: user.businessLicenseUrl || '',
                bankDetails: user.bankDetails || {
                    holderName: '',
                    bankName: '',
                    accountNumber: '',
                    ifscCode: '',
                    bankAddress: '',
                    bankDocUrl: ''
                },
                skills: user.labourDetails?.skills || []
            });
            console.log(`[DEBUG] Profile fetched for user ${req.user.id}: GST=${user.gstNumber}, LIC=${user.licenseNumber}`);
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
            if (user.status === 'approved') {
                const sensitiveFields = ['name', 'email', 'address', 'businessName', 'aadhaarNumber', 'panNumber', 'gstNumber', 'licenseNumber', 'bankDetails'];
                for (const field of sensitiveFields) {
                    if (req.body[field] !== undefined) {
                        // For GST and License, let's allow if they match current value
                        if (field === 'bankDetails') {
                            // Deep comparison for bank details simplified: if any key is different
                            const b = req.body.bankDetails;
                            const current = user.bankDetails || {};
                            if (
                                (b.holderName && b.holderName !== current.holderName) ||
                                (b.bankName && b.bankName !== current.bankName) ||
                                (b.accountNumber && b.accountNumber !== current.accountNumber) ||
                                (b.ifscCode && b.ifscCode !== current.ifscCode)
                            ) {
                                return res.status(403).json({ error: `Verified bank details cannot be changed. Contact support.` });
                            }
                        } else if (req.body[field] !== user[field] && String(req.body[field]).trim() !== String(user[field] || '').trim()) {
                             return res.status(403).json({ error: `Verified profile info (${field}) cannot be changed. Please contact support to edit ${field}.` });
                        }
                    }
                }
            }
            user.name = req.body.name || user.name;
            user.email = req.body.email && req.body.email.trim() !== '' ? req.body.email : user.email;
            user.address = req.body.address || user.address;
            user.businessName = req.body.businessName || user.businessName;
            user.aadhaarNumber = req.body.aadhaarNumber || user.aadhaarNumber;
            
            // Handle Bank Details
            if (req.body.bankDetails) {
                const b = req.body.bankDetails;
                user.bankDetails = {
                    holderName: b.holderName || (user.bankDetails ? user.bankDetails.holderName : ''),
                    bankName: b.bankName || (user.bankDetails ? user.bankDetails.bankName : ''),
                    accountNumber: b.accountNumber || (user.bankDetails ? user.bankDetails.accountNumber : ''),
                    ifscCode: b.ifscCode || (user.bankDetails ? user.bankDetails.ifscCode : ''),
                    bankAddress: b.bankAddress || (user.bankDetails ? user.bankDetails.bankAddress : ''),
                    bankDocUrl: user.bankDetails ? user.bankDetails.bankDocUrl : ''
                };
            }

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

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Approved bank details cannot be changed. Please contact support.' });
        }

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
        console.log(`[DEBUG] Aadhaar upload request from user: ${req.user.id}`);
        
        if (!req.file) {
            console.log('[DEBUG] No file received in req.file');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[DEBUG] File received: ${req.file.originalname}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`);

        const user = await User.findById(req.user.id);
        if (!user) {
            console.log(`[DEBUG] User not found for ID: ${req.user.id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Verified Aadhaar document cannot be changed' });
        }

        const fileUrl = `uploads/${req.file.filename}`;
        user.aadhaarDocUrl = fileUrl;
        
        console.log(`[DEBUG] Saving user profile with new Aadhaar URL: ${fileUrl}`);
        await user.save();
        console.log('[DEBUG] Aadhaar upload successful');

        res.json({ message: 'Aadhaar document uploaded successfully', url: fileUrl });
    } catch (error) {
        console.error('[CRITICAL] Aadhaar upload error:', error);
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

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Verified PAN document cannot be changed' });
        }

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

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Verified business license cannot be changed' });
        }

        user.businessLicenseUrl = fileUrl;
        await user.save();
        res.json({ message: 'Business license uploaded successfully', url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'License upload failed' });
    }
});

// @route   POST /api/user/upload-bank-doc
// @desc    Upload Cancelled Cheque / Bank Passbook document
// @access  Private
router.post('/upload-bank-doc', protect, upload.single('bankDoc'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `uploads/${req.file.filename}`;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.status === 'approved') {
            return res.status(403).json({ error: 'Verified bank document cannot be changed' });
        }

        if (!user.bankDetails) user.bankDetails = {};
        user.bankDetails.bankDocUrl = fileUrl;
        user.markModified('bankDetails');
        await user.save();

        res.json({ message: 'Bank document uploaded successfully', url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'Bank document upload failed' });
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
// @desc    Book a soil test with dynamic pricing and payment options
// @access  Private
router.post('/soil-requests', protect, async (req, res) => {
    try {
        const { labId, cropName, sampleType, visitType, testType, state, district, village, paymentMethod } = req.body;
        
        const Settings = require('../models/Settings');
        const Transaction = require('../models/Transaction');
        const settings = await Settings.getSettings();
        const price = settings.pricing.soilTestPrice || 250;

        let paymentStatus = 'Pending';
        let paidAt = null;

        if (paymentMethod !== 'wallet') {
            return res.status(400).json({ error: 'Only Wallet payment is accepted for Soil Testing.' });
        }

        const user = await User.findById(req.user.id);
        if (user.walletBalance < price) {
            return res.status(400).json({ error: `Insufficient wallet balance. Need ₹${price}` });
        }

        // NO DEDUCTION AT BOOKING TIME - deduct when Lab accepts.
        paymentStatus = 'Pending';
        paidAt = null;

        const request = new SoilRequest({
            farmer: req.user.id,
            lab: labId || undefined,
            cropName: cropName || '',
            sampleType: sampleType || 'Field Soil',
            visitType: visitType || 'I will visit lab',
            testType: testType || 'NPK',
            state: state || '',
            district: district || '',
            village: village || '',
            price: price,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: paymentStatus,
            paidAt: paidAt,
            status: 'New'
        });

        await request.save();

        // Notify the Lab Employee if labId provided, ELSE notify Admin
        try {
            const { sendNotification } = require('../services/notificationService');
            if (labId) {
                await sendNotification(labId, {
                    title: 'New Soil Test Request',
                    messageHi: `किसान ${user.name} ने मिट्टी जांच बुक की है (${paymentMethod === 'wallet' ? 'Wallet Paid' : 'Cash'}).`,
                    messageEn: `Farmer ${user.name} has booked a soil test (${paymentMethod === 'wallet' ? 'Wallet Paid' : 'Cash'}).`,
                    type: 'soil_test',
                    refId: request._id.toString()
                });
            } else {
                // Find all admins
                const admins = await User.find({ role: 'admin' });
                for (const admin of admins) {
                    await sendNotification(admin._id, {
                        title: 'New Soil Request (Unassigned)',
                        messageHi: `एक नई मिट्टी जांच बुक की गई है। कृपया इसे लैब पार्टनर को असाइन करें।`,
                        messageEn: `A new soil test has been booked. Please assign it to a lab partner.`,
                        type: 'soil_test',
                        refId: request._id.toString()
                    });
                }
            }
        } catch (err) {
            console.error('Booking notification error:', err);
        }

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
            .populate({
                path: 'lab',
                select: 'name businessName phone address',
                match: { _id: { $exists: true } }
            })
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (e) {
        console.error('Fetch my soil requests error:', e);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
});

// @route   GET /api/user/admin/farmers
// @desc    Admin: Search farmers for credit assignment
// @access  Private (Admin Only)
router.get('/admin/farmers', protect, checkModule('users'), async (req, res) => {
    try {
        const { search } = req.query;
        let query = { role: 'farmer' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        const farmers = await User.find(query)
            .select('name phone profilePhotoUrl creditLimit creditUsed status address village')
            .limit(50);
        res.json(farmers);
    } catch (error) {
        console.error('Admin Farmer Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// @route   PUT /api/user/admin/credit/:id
// @desc    Admin: Update farmer credit limit
// @access  Private (Admin Only)
router.put('/admin/credit/:id', protect, checkModule('users'), async (req, res) => {
    try {
        const { creditLimit } = req.body;
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'farmer') return res.status(404).json({ error: 'Farmer not found' });

        user.creditLimit = Number(creditLimit);
        await user.save();

        res.json({ message: `Credit limit updated for ${user.name}`, creditLimit: user.creditLimit });
    } catch (error) {
        console.error('Admin Credit Update error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

module.exports = router;

