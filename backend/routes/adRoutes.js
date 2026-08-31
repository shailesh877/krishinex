const express = require('express');
const router = express.Router();
const AdEnquiry = require('../models/AdEnquiry');
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

// Submit Advertisement Enquiry
router.post('/submit', async (req, res) => {
  try {
    const enquiry = new AdEnquiry(req.body);
    await enquiry.save();

    // Send confirmation email
    if (req.body.email) {
      const mailOptions = {
        from: '"KrishiNex Advertising" <' + process.env.SMTP_USER + '>',
        to: req.body.email,
        subject: 'Advertisement Enquiry Received - KrishiNex',
        html: `
          <h3>Thank you for your interest in advertising with KrishiNex!</h3>
          <p>Hi ${req.body.fullName},</p>
          <p>We have received your enquiry regarding <b>${req.body.category}</b> for <b>${req.body.company}</b>.</p>
          <p>Our team will review your proposal and get back to you within 24 hours.</p>
          <br>
          <p>Best Regards,<br>Team KrishiNex</p>
        `,
      };
      transporter.sendMail(mailOptions).catch(err => console.log('Mail Error:', err));
    }

    res.status(201).json({ success: true, message: 'Enquiry submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all ad enquiries
router.get('/all', async (req, res) => {
  try {
    const enquiries = await AdEnquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Update status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await AdEnquiry.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
