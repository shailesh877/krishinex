const nodemailer = require('nodemailer');

// Configure transporter - User will fill real SMTP in .env
// Defaults to a dummy logger if no credentials found
const createTransporter = () => {
    // Check for real SMTP config in env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for others
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback: Log to console in development
    console.warn('[EMAIL-SERVICE] No SMTP credentials in .env. Logging email to console instead.');
    return {
        sendMail: async (options) => {
            console.log('-------------------------------------------');
            console.log('📧 [MOCK EMAIL SENT]');
            console.log('To:', options.to);
            console.log('Subject:', options.subject);
            console.log('Body:', options.text);
            console.log('-------------------------------------------');
            return { messageId: 'mock-id-' + Date.now() };
        }
    };
};

const transporter = createTransporter();

/**
 * Send a 4-digit OTP to the admin for login
 * @param {string} to - Recipient email
 * @param {string} otp - 4-digit code
 */
const sendAdminOtp = async (to, otp) => {
    const mailOptions = {
        from: `"KrishiNex Security" <${process.env.SMTP_USER || 'no-reply@krishinex.com'}>`,
        to,
        subject: 'KrishiNex Admin Login - Verification Code',
        text: `Your 4-digit verification code is: ${otp}\n\nThis code expires in 5 minutes. If you did not request this code, please ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Admin Login Verification</h2>
                <p style="color: #475569; font-size: 16px;">Hello Admin,</p>
                <p style="color: #475569; font-size: 16px;">Use the following 4-digit code to complete your login to the KrishiNex Management Portal:</p>
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #16a34a;">${otp}</span>
                </div>
                <p style="color: #64748b; font-size: 14px;">This code is valid for <b>5 minutes</b>. Please do not share this code with anyone.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">KrishiNex Security Infrastructure<br>This is an automated security message. Please do not reply.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL-SERVICE] OTP sent successfully to:', to);
        return info;
    } catch (error) {
        console.error('[EMAIL-SERVICE] Error sending email:', error);
        throw error;
    }
};

module.exports = { sendAdminOtp };
