const express = require('express');
const router = express.Router();
const KSPApplication = require('../models/KSPApplication');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
