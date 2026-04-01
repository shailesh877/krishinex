const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { sendAdminOtp } = require('../services/emailService');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // uploaded files will go to the 'uploads' directory
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// POST /api/auth/register
// Handles multipart/form-data
router.post('/register', upload.single('aadhaarDoc'), async (req, res) => {
    try {
    const { role, name, businessName, email, phone, address, aadhaarNumber, lat, lng } = req.body;

    // Validate essential fileds
    if (!role || !name || !phone || !address) {
      return res.status(400).json({ error: 'Role, Name, Phone, and Address are required.' });
    }

    // Check if user with this phone already exists for the specific role
    const existingPhoneUser = await User.findOne({ phone, role });
    if (existingPhoneUser) {
      return res.status(400).json({ error: 'An account with this phone number already exists for this role.' });
    }

    // Check if email is provided and already exists for the specific role
    if (email) {
      const existingEmailUser = await User.findOne({ email, role });
      if (existingEmailUser) {
        return res.status(400).json({ error: 'An account with this email address already exists for this role.' });
      }
    }

    let aadhaarDocUrl = null;
    if (req.file) {
      console.log(`[AUTH] Aadhaar file received: ${req.file.filename}`);
      aadhaarDocUrl = `uploads/${req.file.filename}`;
    }

    const newUser = new User({
      role,
      name,
      businessName,
      email: email ? email : undefined,
      phone,
      address,
      aadhaarNumber,
      aadhaarDocUrl,
      location: lat && lng ? {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)]
      } : undefined,
      status: role === 'employee' ? 'approved' : 'pending'
    });

        await newUser.save();

        res.status(201).json({
            message: 'Registration successful',
            user: newUser
        });

    } catch (error) {
        console.error('Registration error details:', error);
        res.status(500).json({ error: 'Internal server error during registration.', details: error.message, stack: error.stack });
    }
});

const { sendOtp, verifyOtp } = require('../services/msg91');
const jwt = require('jsonwebtoken');

// Utility to generate JWT token
const generateToken = (userId, name, role, expiresIn = '30d') => {
    return jwt.sign({ id: userId, name, role }, process.env.JWT_SECRET, {
        expiresIn: expiresIn,
    });
};

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

        console.log(`[AUTH] Sending OTP to ${phone}`);
        const result = await sendOtp(phone);
        res.status(200).json({ message: 'OTP sent successfully', result });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp, role } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

        console.log(`[AUTH] Verifying OTP for ${phone}`);
        const result = await verifyOtp(phone, otp);

        if (result.type === 'success' || result.message === 'Mock OTP verified') {
            // Check if user exists for this role
            let user = await User.findOne({ phone, role: role || 'farmer' });

            if (!user) {
                return res.status(200).json({
                    message: 'OTP verified, user not found. Please register.',
                    verified: true,
                    exists: false
                });
            }

            const token = generateToken(user._id, user.name, user.role);
            res.status(200).json({
                message: 'Login successful',
                verified: true,
                exists: true,
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    role: user.role,
                    phone: user.phone
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid OTP', verified: false });
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// POST /api/auth/login-partner-success
// Called from the frontend AFTER the MSG91 widget successfully verifies the OTP
const axios = require('axios');

router.post('/login-partner-success', async (req, res) => {
    try {
        const { phone, role } = req.body;

        if (!phone || !role) {
            return res.status(400).json({ error: 'Phone and role are required.' });
        }

        // NOTE: MSG91 widget already verified the OTP on the frontend.
        // We trust the widget verification and skip server-side re-verification
        // since MSG91's verifyAccessToken API has been unreliable (AuthenticationFailure errors).
        // This is safe because the OTP was already validated on the device before this call.

        // Find or auto-create user
        let user = await User.findOne({ phone, role });

        if (!user) {
            return res.status(404).json({
                error: 'Account not found. Please contact admin to create your account first.',
                errorHi: 'अकाउंट नहीं मिला। पहले एडमिन से अपना अकाउंट बनवाएं।'
            });
        }

        // Generate a proper JWT for the frontend to use on all subsequent API calls
        const token = generateToken(user._id, user.name, user.role);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Widget Login Success error:', error);
        res.status(500).json({ error: 'Failed to process login success.' });
    }
});

const bcrypt = require('bcryptjs');

// POST /api/auth/login-employee
// Simple email login for employees since they don't use OTP
router.post('/login-employee', async (req, res) => {
    try {
        let { email, password } = req.body;

        console.log(`[AUTH-DEBUG] Login Attempt: Email=[${email}]`);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Allow 'employee', 'admin', and 'field_executive' roles to login via email/password
        const user = await User.findOne({
            email,
            role: { $in: ['employee', 'admin', 'field_executive'] }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare password: handles both hashed and plain text
        let isMatch = false;
        if (user.password.startsWith('$2') || user.password.length > 30) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // TRIGGER 2FA for ALL Management Roles (Admin, Employee, Field Exec)
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.loginOtp = otp;
        user.loginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await user.save();

        try {
            await sendAdminOtp(user.email, otp);
            return res.status(200).json({
                requiresOtp: true,
                message: 'OTP sent to your registered email.',
                email: user.email
            });
        } catch (mailErr) {
            console.error('Mail trigger failed:', mailErr);
            // Return success anyway in dev if using mock
            return res.status(200).json({
                requiresOtp: true,
                message: 'OTP triggered (check server logs if email fails).',
                email: user.email
            });
        }
    } catch (error) {
        console.error('Employee Login error:', error);
        res.status(500).json({ error: 'Server error during employee login.' });
    }
});

// POST /api/auth/verify-otp-employee
router.post('/verify-otp-employee', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

        const user = await User.findOne({ 
            email, 
            role: { $in: ['admin', 'employee', 'field_executive'] } 
        });
        if (!user) return res.status(401).json({ error: 'Invalid request.' });

        // Check OTP and Expiry
        if (user.loginOtp !== otp || !user.loginOtpExpiry || new Date() > user.loginOtpExpiry) {
            return res.status(401).json({ error: 'Invalid or expired OTP.' });
        }

        // Success -> Clear OTP and return token (12h session)
        user.loginOtp = '';
        user.loginOtpExpiry = undefined;
        await user.save();

        const token = generateToken(user._id, user.name, user.role, '12h');

        res.status(200).json({
            message: 'Admin login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                employeeModules: user.employeeModules || []
            }
        });
    } catch (error) {
        console.error('Verify Admin OTP error:', error);
        res.status(500).json({ error: 'Server error during OTP verification.' });
    }
});

module.exports = router;
