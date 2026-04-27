const express = require('express');
const router = express.Router();
const KSPApplication = require('../models/KSPApplication');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const KSPCardLog = require('../models/KSPCardLog');
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

const checkApprovedKsp = async (req, res, next) => {
  try {
    const ksp = await User.findById(req.user.id);
    if (!ksp) return res.status(404).json({ error: 'KSP not found' });
    if (ksp.status !== 'approved') {
      return res.status(403).json({ error: 'Your account is currently inactive or blocked. Please contact admin.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error checking account status.' });
  }
};

// KSP Partner Login (Email/Password -> Step 1: Send OTP)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with role 'ksp'
    const user = await User.findOne({ email: email.toLowerCase(), role: 'ksp' });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Credentials valid -> Step 2: Generate and Send Email OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.loginOtp = otp;
    user.loginOtpExpiry = expiry;
    await user.save();

    // Send Email
    const mailOptions = {
      from: `"KrishiNex Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'KSP Portal Login OTP',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Verification Code</h2>
          <p>Hello <b>${user.name}</b>,</p>
          <p>Your 6-digit verification code for KSP Partner Portal login is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">${otp}</div>
          <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8;">KrishiNex Technologies &copy; 2026</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'OTP sent to your registered email',
      step: 2 
    });

  } catch (error) {
    console.error('KSP Login Error:', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

// Verify OTP and Complete Login
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'ksp' });

    if (!user || user.loginOtp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.loginOtpExpiry) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    // Clear OTP after success
    user.loginOtp = '';
    user.loginOtpExpiry = null;
    await user.save();

    // Generate Token
    const token = generateToken(user._id, user.name, user.role);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance
      }
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Dashboard Stats
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ksp') {
      return res.status(403).json({ error: 'Access denied. KSP only.' });
    }

    const user = await User.findById(req.user.id).select('name walletBalance status kspType phone email address businessName walletNumber bankDetails kspPartnerId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Dashboard Stats Aggressive Self-Healing
    if (!user.kspPartnerId || user.kspPartnerId.trim() === "") {
      const prefix = (user.kspType === 'KSP Prime') ? 'KSPP' : 'KSPD';
      let newId;
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 50) {
        const digits = Math.floor(100000 + Math.random() * 900000);
        newId = `${prefix}${digits}`;
        const existing = await User.findOne({ kspPartnerId: newId });
        if (!existing) isUnique = true;
        attempts++;
      }
      user.kspPartnerId = newId;
      await user.save();
    }
    const transactions = await Transaction.find({
      recipient: req.user.id
    }).sort({ createdAt: -1 }).limit(10);

    const response = {
      balance: user.walletBalance || 0,
      name: user.name,
      status: user.status,
      kspType: user.kspType || 'KSP Digital',
      phone: user.phone,
      email: user.email || '',
      address: user.address || '',
      businessName: user.businessName || '',
      walletNumber: user.walletNumber || '',
      kspId: user.kspPartnerId || '',
      kspPartnerId: user.kspPartnerId || '',
      bankDetails: {
        holderName: user.bankDetails?.holderName || '',
        bankName: user.bankDetails?.bankName || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        ifscCode: user.bankDetails?.ifscCode || '',
        bankAddress: user.bankDetails?.bankAddress || ''
      },
      recentTransactions: transactions
    };

    res.json(response);
  } catch (error) {
    console.error('KSP Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Verification Route
router.get('/ping-test', (req, res) => {
  res.json({ message: 'KSP Routes is live and updated!', timestamp: new Date() });
});

// Search Farmer for Withdrawal
router.post('/search', protect, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const users = await User.find({
      role: { $in: ['farmer', 'buyer', 'equipment', 'soil', 'shop', 'ksp', 'labour'] },
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

const { sendNotification } = require('../services/notificationService');

// Withdraw: Request OTP
router.post('/withdraw/request-otp', protect, checkApprovedKsp, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const farmer = await User.findById(userId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    if (farmer.walletBalance < amount) {
      return res.status(400).json({ error: 'Insufficient farmer balance' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[KSP] Sending withdrawal OTP to farmer ${farmer.phone}: ${otp}`);
    
    // Send via SMS
    await sendOtp(farmer.phone, otp);
    
    // Send via App Notification (Bell icon)
    try {
      await sendNotification(farmer._id, {
        title: 'Withdrawal OTP',
        messageEn: `Your OTP for withdrawal of ₹${amount} is ${otp}. Valid for 10 minutes.`,
        messageHi: `₹${amount} की निकासी के लिए आपका OTP ${otp} है। 10 मिनट के लिए मान्य।`,
        type: 'payment',
        data: { otp, amount: amount.toString() }
      });
    } catch (notifyErr) {
      console.error('KSP Notification Error:', notifyErr);
      // We don't fail the request if only notification fails, as SMS might still work
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('KSP Withdraw Request Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Withdraw: Confirm
router.post('/withdraw/confirm', protect, checkApprovedKsp, async (req, res) => {
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

    // 1. Fetch KSP Commission from Settings
    const settings = await Settings.getSettings();
    const kspCommissionPercent = settings.commissions.ksp || 0;
    const commissionAmt = (amt * kspCommissionPercent) / 100;

    // 2. Atomic Balance Updates
    // Farmer pays the principal
    farmer.walletBalance -= amt;

    // KSP Partner receives principal + commission from Admin
    ksp.walletBalance += (amt + commissionAmt);

    // Admin pays the commission
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.walletBalance = (admin.walletBalance || 0) - commissionAmt;
      await admin.save();
    }

    await farmer.save();
    await ksp.save();

    // 3. Create Transactions
    const saleId = `KSP-WDL-${Date.now()}`;

    // Debit for Farmer (Principal)
    await Transaction.create({
      transactionId: `${saleId}-F-D`,
      recipient: farmer._id,
      module: 'KSP',
      amount: amt,
      type: 'Debit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Cash withdrawal from KSP: ${ksp.name}`
    });

    // Credit for KSP (Principal + Commission)
    await Transaction.create({
      transactionId: `${saleId}-K-C`,
      recipient: ksp._id,
      module: 'KSP',
      amount: amt + commissionAmt,
      type: 'Credit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Cash given to farmer: ${farmer.name} (Principal: ₹${amt}, Comm: ₹${commissionAmt})`
    });

    // Debit for Admin (Commission Only)
    if (admin) {
      await Transaction.create({
        transactionId: `${saleId}-A-D`,
        recipient: admin._id,
        module: 'KSP',
        amount: commissionAmt,
        type: 'Debit',
        paymentMode: 'NexCard Wallet',
        status: 'Completed',
        performedBy: ksp._id,
        note: `KSP Withdrawal Commission paid to ${ksp.name} for farmer ${farmer.name}`
      });
    }

    res.json({ 
      success: true, 
      message: 'Withdrawal successful',
      data: {
        principal: amt,
        commission: commissionAmt,
        totalCredited: amt + commissionAmt
      }
    });

  } catch (error) {
    console.error('KSP Withdraw Confirm Error:', error);
    res.status(500).json({ error: 'Withdrawal failed: ' + error.message });
  }
});

// Recharge: Request OTP
router.post('/recharge/request-otp', protect, checkApprovedKsp, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const ksp = await User.findById(req.user.id);
    if (!ksp) return res.status(404).json({ error: 'KSP not found' });

    if (ksp.walletBalance < amount) {
      return res.status(400).json({ error: `Insufficient KSP balance. You need ₹${amount} in your wallet.` });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[KSP] Sending recharge OTP to user ${targetUser.phone}: ${otp}`);
    
    // Send via SMS
    await sendOtp(targetUser.phone, otp);
    
    // Send via App Notification
    try {
      await sendNotification(targetUser._id, {
        title: 'Recharge OTP',
        messageEn: `Your OTP to confirm recharge of ₹${amount} from KSP is ${otp}. Valid for 10 minutes.`,
        messageHi: `KSP से ₹${amount} के रिचार्ज की पुष्टि के लिए आपका OTP ${otp} है। 10 मिनट के लिए मान्य।`,
        type: 'payment',
        data: { otp, amount: amount.toString() }
      });
    } catch (notifyErr) {
      console.error('KSP Notification Error:', notifyErr);
    }

    res.json({ success: true, message: 'OTP sent to user' });
  } catch (error) {
    console.error('KSP Recharge Request Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Recharge: Confirm
router.post('/recharge/confirm', protect, checkApprovedKsp, async (req, res) => {
  try {
    const { userId, amount, otp } = req.body;
    const amt = parseFloat(amount);

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const ksp = await User.findById(req.user.id);
    if (!ksp) return res.status(404).json({ error: 'KSP Partner not found' });

    // Verify OTP
    const verifyResult = await verifyOtp(targetUser.phone, otp);
    if (verifyResult.type !== 'success' && verifyResult.message !== 'Mock OTP verified') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (ksp.walletBalance < amt) {
      return res.status(400).json({ error: 'Insufficient KSP balance for this recharge' });
    }

    // 1. Fetch KSP Recharge Commission from Settings
    const settings = await Settings.getSettings();
    const kspRechargePercent = settings.commissions.kspRecharge || 0;
    const commissionAmt = (amt * kspRechargePercent) / 100;

    // 2. Atomic Balance Updates
    // KSP pays the principal
    ksp.walletBalance -= amt;

    // TargetUser receives principal
    targetUser.walletBalance = (targetUser.walletBalance || 0) + amt;

    // KSP receives commission from Admin
    ksp.walletBalance += commissionAmt;

    // Admin pays the commission
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.walletBalance = (admin.walletBalance || 0) - commissionAmt;
      await admin.save();
    }

    await targetUser.save();
    await ksp.save();

    // 3. Create Transactions
    const rechargeId = `KSP-RCH-${Date.now()}`;

    // Debit for KSP (Principal paid)
    await Transaction.create({
      transactionId: `${rechargeId}-K-D`,
      recipient: ksp._id,
      module: 'KSP',
      amount: amt,
      type: 'Debit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Wallet Recharge to ${targetUser.name} (${targetUser.role})`
    });

    // Credit for Target User (Principal)
    await Transaction.create({
      transactionId: `${rechargeId}-U-C`,
      recipient: targetUser._id,
      module: 'KSP',
      amount: amt,
      type: 'Credit',
      paymentMode: 'Cash',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Wallet recharged by KSP: ${ksp.name}`
    });

    // Credit for KSP (Commission)
    if (commissionAmt > 0) {
        await Transaction.create({
        transactionId: `${rechargeId}-K-C`,
        recipient: ksp._id,
        module: 'KSP',
        amount: commissionAmt,
        type: 'Credit',
        paymentMode: 'NexCard Wallet',
        status: 'Completed',
        performedBy: ksp._id,
        note: `Commission for recharging ${targetUser.name} (Amount: ₹${amt})`
        });

        // Debit for Admin (Commission Paid)
        if (admin) {
        await Transaction.create({
            transactionId: `${rechargeId}-A-D`,
            recipient: admin._id,
            module: 'KSP',
            amount: commissionAmt,
            type: 'Debit',
            paymentMode: 'NexCard Wallet',
            status: 'Completed',
            performedBy: ksp._id,
            note: `KSP Recharge Commission paid to ${ksp.name} for user ${targetUser.name}`
        });
        }
    }

    res.json({ 
      success: true, 
      message: 'Recharge successful',
      data: {
        principalRecharged: amt,
        commissionEarned: commissionAmt,
        netKspDeduction: amt - commissionAmt
      }
    });

  } catch (error) {
    console.error('KSP Recharge Confirm Error:', error);
    res.status(500).json({ error: 'Recharge failed: ' + error.message });
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

/**
 * @route   POST /api/ksp/search-user
 * @desc    Search for any user (farmer/partner) by phone for card generation
 * @access  Private (KSP only)
 */
router.post('/search-user', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ksp') {
      return res.status(403).json({ error: 'Access denied. KSP only.' });
    }

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    // Search for users with this phone across all relevant roles
    const users = await User.find({ 
      phone: new RegExp(phone, 'i'),
      role: { $in: ['farmer', 'buyer', 'equipment', 'soil', 'shop', 'ksp', 'labour'] }
    }).select('name phone role cardNumber walletNumber walletBalance status');

    res.json(users);
  } catch (error) {
    console.error('KSP User Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * @route   POST /api/ksp/generate-card
 * @desc    Generate a 16-digit Nex Card for a user
 * @access  Private (KSP only)
 */
router.post('/generate-card', protect, checkApprovedKsp, async (req, res) => {
  try {
    if (req.user.role !== 'ksp') {
      return res.status(403).json({ error: 'Access denied. KSP only.' });
    }

    const { userId, cardNumber } = req.body;

    if (!cardNumber || cardNumber.length !== 16) {
      return res.status(400).json({ error: 'Sahi 16-digit card number hona chahiye' });
    }
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.cardNumber) {
      return res.status(400).json({ error: 'User already has a Nex Card' });
    }

    // 1. Fetch Charges from Settings
    const settings = await Settings.getSettings();
    const cardCharge = settings.pricing.nexCardCharges || 0;

    // 2. Check KSP Wallet Balance
    const ksp = await User.findById(req.user.id);
    if (!ksp) return res.status(404).json({ error: 'KSP Partner not found' });

    if (ksp.walletBalance < cardCharge) {
      return res.status(400).json({ error: `Insufficient balance. Card generation charges: ₹${cardCharge}` });
    }

    // 3. Check uniqueness of provided card number
    const existingUser = await User.findOne({ cardNumber });
    if (existingUser) {
      return res.status(400).json({ error: 'Ye card number pehle se use ho raha hai' });
    }

    // 4. Update Balances (Atomic-like)
    ksp.walletBalance -= cardCharge;
    
    // Credit Admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.walletBalance = (admin.walletBalance || 0) + cardCharge;
      await admin.save();
    }

    // Save KSP and Target User
    targetUser.cardNumber = cardNumber;
    await targetUser.save();
    await ksp.save();

    // 5. Create Transactions
    const txnId = `NEX-CARD-${Date.now()}`;
    
    // Debit for KSP
    await Transaction.create({
      transactionId: `${txnId}-KSP-D`,
      recipient: ksp._id,
      module: 'KSP',
      amount: cardCharge,
      type: 'Debit',
      paymentMode: 'NexCard Wallet',
      status: 'Completed',
      performedBy: ksp._id,
      note: `Nex Card generation charges for user ${targetUser.name}`
    });

    // Credit for Admin
    if (admin) {
      await Transaction.create({
        transactionId: `${txnId}-ADM-C`,
        recipient: admin._id,
        module: 'KSP',
        amount: cardCharge,
        type: 'Credit',
        paymentMode: 'NexCard Wallet',
        status: 'Completed',
        performedBy: ksp._id,
        note: `Nex Card issuance fee from KSP ${ksp.name}`
      });
    }

    // 6. Log the generation
    await KSPCardLog.create({
      kspId: req.user.id,
      targetUserId: targetUser._id,
      cardNumber: cardNumber
    });

    res.json({
      success: true,
      message: 'Nex Card generated successfully',
      cardNumber: cardNumber,
      userName: targetUser.name,
      deductedAmount: cardCharge
    });

  } catch (error) {
    console.error('KSP Generate Card Error:', error);
    res.status(500).json({ error: 'Failed to generate card' });
  }
});

/**
 * @route   GET /api/ksp/card-history
 * @desc    Get history of cards generated by this KSP
 * @access  Private (KSP only)
 */
router.get('/card-history', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ksp') {
      return res.status(403).json({ error: 'Access denied. KSP only.' });
    }

    const history = await KSPCardLog.find({ kspId: req.user.id })
      .populate('targetUserId', 'name phone role')
      .sort({ generatedAt: -1 });

    res.json(history);
  } catch (error) {
    console.error('KSP Card History Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * @route   POST /api/ksp/forgot-password
 * @desc    Initiate forgot password (step 1: send OTP)
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase(), role: 'ksp' });
    if (!user) return res.status(404).json({ error: 'No KSP partner found with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.loginOtp = otp;
    user.loginOtpExpiry = expiry;
    await user.save();

    const mailOptions = {
      from: `"KrishiNex Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'KSP Password Reset OTP',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Password Reset Code</h2>
          <p>Hello <b>${user.name}</b>,</p>
          <p>You requested to reset your KSP Partner Portal password. Your 6ndigit code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">${otp}</div>
          <p style="color: #64748b; font-size: 13px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8;">KrishiNex Technologies &copy; 2026</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP sent to your email' });

  } catch (error) {
    console.error('KSP Forgot Password Error:', error);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

/**
 * @route   POST /api/ksp/verify-reset-otp
 * @desc    Verify OTP for password reset
 * @access  Public
 */
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase(), role: 'ksp' });
    if (!user || user.loginOtp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.loginOtpExpiry) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * @route   POST /api/ksp/reset-password
 * @desc    Reset password using OTP
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'ksp' });
    if (!user || user.loginOtp !== otp) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Hash and Save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.loginOtp = '';
    user.loginOtpExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (error) {
    console.error('KSP Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * @route   POST /api/ksp/change-password
 * @desc    Change password while logged in
 * @access  Private (KSP only)
 */
router.post('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify Old
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(oldPassword, user.password);
    } else {
      isMatch = (oldPassword === user.password);
    }

    if (!isMatch) return res.status(401).json({ error: 'Purana password galat hai' });

    // Hash New
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password successfully changed!' });

  } catch (error) {
    console.error('KSP Change Password Error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Support Ticket: KSP Partner raises a support ticket
router.post('/support-ticket', protect, async (req, res) => {
  try {
    const { category, subject, description, priority } = req.body;
    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Category, Subject aur Description required ha' });
    }
    const ksp = await User.findById(req.user.id).select('name phone businessName');
    if (!ksp) return res.status(404).json({ error: 'KSP Partner not found' });

    const ticketId = `TKT-KSP-${Date.now().toString().slice(-7)}`;

    // Save ticket as a notification to admin
    const { sendNotification } = require('../services/notificationService');
    const admin = await User.findOne({ role: 'admin' }).select('_id');
    if (admin) {
      try {
        await sendNotification(admin._id, {
          title: `[${priority || 'Normal'}] Support Ticket: ${category}`,
          messageEn: `${ksp.name} (${ksp.phone}) raised a ticket.\n\nSubject: ${subject}\n\nDetails: ${description}\n\nTicket ID: ${ticketId}`,
          messageHi: `KSP Partner ${ksp.name} ne ek support ticket raise kiya hai. Ticket ID: ${ticketId}`,
          type: 'support',
          data: { ticketId, category, priority: priority || 'Normal', kspId: req.user.id.toString() }
        });
      } catch (notifErr) {
        console.error('Support ticket notification error:', notifErr);
      }
    }

    console.log(`[SUPPORT TICKET] ${ticketId} from KSP ${ksp.name} (${ksp.phone}) | Category: ${category} | Priority: ${priority}`);
    res.json({ success: true, ticketId, message: 'Ticket submitted successfully' });

  } catch (error) {
    console.error('Support Ticket Error:', error);
    res.status(500).json({ error: 'Failed to submit ticket' });
  }
});

module.exports = router;
