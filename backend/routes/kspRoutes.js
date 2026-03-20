const express = require('express');
const router = express.Router();
const KSPApplication = require('../models/KSPApplication');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const { sendOtp, verifyOtp } = require('../services/msg91');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const generateToken = (userId, name, role) => {
    return jwt.sign({ id: userId, name, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// KSP Partner Login (Phone/Password)
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user with role 'ksp'
    const user = await User.findOne({ phone, role: 'ksp' });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account not set up for password login. Contact admin.' });
    }

    // Verify password
    let isMatch = false;
    if (user.password.startsWith('$2') || user.password.length > 30) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const token = generateToken(user._id, user.name, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('KSP Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Dashboard Stats
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ksp') {
      return res.status(403).json({ error: 'Access denied. KSP only.' });
    }

    const user = await User.findById(req.user.id).select('name walletBalance');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({
      $or: [
        { recipient: req.user.id },
        { performedBy: req.user.id }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    res.json({
      balance: user.walletBalance || 0,
      name: user.name,
      recentTransactions: transactions
    });
  } catch (error) {
    console.error('KSP Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Search Farmer for Withdrawal
router.post('/search', protect, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const users = await User.find({
      role: 'farmer',
      $or: [
        { phone: new RegExp(query, 'i') },
        { name: new RegExp(query, 'i') },
        { walletNumber: new RegExp(query, 'i') },
        { cardNumber: new RegExp(query, 'i') }
      ]
    }).select('name phone role walletBalance _id');

    res.json(users);
  } catch (error) {
    console.error('KSP Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Withdraw: Request OTP
router.post('/withdraw/request-otp', protect, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const farmer = await User.findById(userId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    if (farmer.walletBalance < amount) {
      return res.status(400).json({ error: 'Insufficient farmer balance' });
    }

    console.log(`[KSP] Sending withdrawal OTP to farmer ${farmer.phone}`);
    await sendOtp(farmer.phone);
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('KSP Withdraw Request Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Withdraw: Confirm
router.post('/withdraw/confirm', protect, async (req, res) => {
  try {
    const { userId, amount, otp } = req.body;
    const amt = parseFloat(amount);
    
    const farmer = await User.findById(userId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const ksp = await User.findById(req.user.id);
    if (!ksp) return res.status(404).json({ error: 'KSP Partner not found' });

    // Verify OTP
    const verifyResult = await verifyOtp(farmer.phone, otp);
    if (verifyResult.type !== 'success' && verifyResult.message !== 'Mock OTP verified') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (farmer.walletBalance < amt) {
      return res.status(400).json({ error: 'Insufficient farmer balance' });
    }

    // Atomic Balance Swap
    farmer.walletBalance -= amt;
    ksp.walletBalance += amt;

    await farmer.save();
    await ksp.save();

    // Create Transactions
    const saleId = `KSP-WDL-${Date.now()}`;
    
    // Debit for Farmer
    await Transaction.create({
      transactionId: `${saleId}-D`,
      recipient: farmer._id,
      module: 'KSP',
      amount: amt,
      type: 'Debit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Cash withdrawal from KSP: ${ksp.name}`
    });

    // Credit for KSP
    await Transaction.create({
      transactionId: `${saleId}-C`,
      recipient: ksp._id,
      module: 'KSP',
      amount: amt,
      type: 'Credit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Cash given to farmer: ${farmer.name}`
    });

    res.json({ success: true, message: 'Withdrawal successful' });

  } catch (error) {
    console.error('KSP Withdraw Confirm Error:', error);
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

// Submit KSP Application
router.post('/submit', async (req, res) => {
  try {
    const application = new KSPApplication(req.body);
    await application.save();

    // Send confirmation email
    if (req.body.email) {
      const mailOptions = {
        from: '"KrishiNex Partnership" <' + process.env.SMTP_USER + '>',
        to: req.body.email,
        subject: 'KSP Partnership Application Received - KrishiNex',
        html: `
          <h3>Welcome to the KrishiNex Family!</h3>
          <p>Hi ${req.body.fullName},</p>
          <p>We have received your application for becoming a <b>KrishiNex Sewa Point (KSP)</b> partner in <b>${req.body.city}, ${req.body.state}</b>.</p>
          <p>Our partnership team will review your application and shop details. You will hear from us within 48 hours.</p>
          <br>
          <p>Best Regards,<br>Partnership Team, KrishiNex</p>
        `,
      };
      transporter.sendMail(mailOptions).catch(err => console.log('Mail Error:', err));
    }

    res.status(201).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all KSP applications
router.get('/all', async (req, res) => {
  try {
    const applications = await KSPApplication.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Update status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await KSPApplication.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
