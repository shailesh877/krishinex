const axios = require('axios');
require('dotenv').config();

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || ''; // Usually provided in .env
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';

// Mock storage for local development
const mockOtpStore = new Map();

/**
 * Send an OTP via MSG91
 * @param {string} phone - Mobile number with country code (e.g. 919876543210)
 * @returns {Promise<object>} response from MSG91
 */
async function sendOtp(phone, customOtp = null) {
    // Ensure phone has country code for MSG91 (default to 91 if 10 digits)
    if (phone.length === 10) phone = '91' + phone;

    // If no auth key or no template ID is provided, we can fallback to a mock for local dev
    if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
        if (!MSG91_TEMPLATE_ID && MSG91_AUTH_KEY) {
            console.warn('MSG91_TEMPLATE_ID missing. Falling back to mock OTP.');
        } else if (!MSG91_AUTH_KEY) {
            console.warn('MSG91_AUTH_KEY missing. Falling back to mock OTP.');
        }
        const otp = customOtp || '1234'; 
        mockOtpStore.set(phone, otp);
        return { type: 'success', message: `Mock OTP generated: ${otp}` };
    }

    let url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${phone}`;
    if (customOtp) {
        url += `&otp=${customOtp}`;
    }

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
    // Ensure phone has country code
    if (phone.length === 10) phone = '91' + phone;

    // Mock fallback for local dev
    if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
        console.warn('[MSG91-DEBUG] Mocking OTP Verify for', phone);
        const storedOtp = mockOtpStore.get(phone) || '1234';
        if (otp === storedOtp) {
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
