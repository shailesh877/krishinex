const nodemailer = require('nodemailer');
require('dotenv').config();

const testSmtp = async (port, secure) => {
    console.log(`\n--- Testing SMTP: Port=${port}, Secure=${secure} ---`);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.zoho.com',
        port: port,
        secure: secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        debug: true,
        logger: true
    });

    try {
        await transporter.verify();
        console.log(`✅ SUCCESS: Connection verified for Port ${port}`);
    } catch (error) {
        console.error(`❌ FAILED: Port ${port} - ${error.message}`);
    }
};

(async () => {
    // Test both common ports
    await testSmtp(587, false);
    await testSmtp(465, true);
})();
