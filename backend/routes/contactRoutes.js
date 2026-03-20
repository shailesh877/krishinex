const express = require('express');
const router = express.Router();
const ContactRequest = require('../models/ContactRequest');
const nodemailer = require('nodemailer');

// Submit contact form
router.post('/submit', async (req, res) => {
    try {
        const { name, phone, email, subject, message } = req.body;

        const newRequest = new ContactRequest({
            name,
            phone,
            email,
            subject,
            message
        });

        await newRequest.save();

        // Send confirmation email if email is provided
        if (email) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                const mailOptions = {
                    from: `"KrishiNex Support" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: `Ticket Generated: ${subject}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #2e7d32;">Hello ${name},</h2>
                            <p>Thank you for contacting KrishiNex. We have received your message and a ticket has been generated.</p>
                            <div style="background: #f4f4f4; padding: 15px; border-left: 4px solid #2e7d32;">
                                <p><strong>Subject:</strong> ${subject}</p>
                                <p><strong>Message:</strong> ${message}</p>
                            </div>
                            <p>Our team will get back to you within 24 hours.</p>
                            <p>Best Regards,<br>Team KrishiNex</p>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
            } catch (mailError) {
                console.error('Email sending failed:', mailError);
                // We don't fail the request if email fails, as the ticket is saved
            }
        }

        res.status(201).json({ message: 'Message sent successfully!', ticketId: newRequest._id });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin: Get all inquiries
router.get('/all', async (req, res) => {
    try {
        const inquiries = await ContactRequest.find().sort({ createdAt: -1 });
        res.json(inquiries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
});

// Admin: Update inquiry status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const inquiry = await ContactRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(inquiry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
