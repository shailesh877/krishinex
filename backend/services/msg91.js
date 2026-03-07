const axios = require('axios');
require('dotenv').config();

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || ''; // Usually provided in .env
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';

/**
 * Send an OTP via MSG91
 * @param {string} phone - Mobile number with country code (e.g. 919876543210)
 * @returns {Promise<object>} response from MSG91
 */
async function sendOtp(phone) {
    // If no auth key is provided, we can fallback to a mock for local dev
    if (!MSG91_AUTH_KEY) {
        console.warn('MSG91_AUTH_KEY not set. Mocking OTP Send for', phone);
        return { type: 'success', message: 'Mock OTP sent (use 123456)' };
    }

    const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${phone}`;
    try {
        const response = await axios.post(
            url,
            {}, // body
            {
                headers: {
                    'authkey': MSG91_AUTH_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error sending OTP via MSG91:', error.response?.data || error.message);
        throw new Error('Failed to send OTP via MSG91');
    }
}

/**
 * Verify an OTP via MSG91
 * @param {string} phone - Mobile number with country code (e.g. 919876543210)
 * @param {string} otp - The OTP entered by the user
 * @returns {Promise<object>} response from MSG91
 */
async function verifyOtp(phone, otp) {
    // Mock fallback for local dev
    if (!MSG91_AUTH_KEY) {
        console.warn('MSG91_AUTH_KEY not set. Mocking OTP Verify for', phone);
        if (otp === '123456') {
            return { type: 'success', message: 'Mock OTP verified' };
        } else {
            return { type: 'error', message: 'Invalid Mock OTP' };
        }
    }

    const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${phone}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'authkey': MSG91_AUTH_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error verifying OTP via MSG91:', error.response?.data || error.message);
        throw new Error('Failed to verify OTP via MSG91');
    }
}

module.exports = {
    sendOtp,
    verifyOtp
};
