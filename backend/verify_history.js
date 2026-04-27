
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const axios = require('axios');

async function verifyHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ email: 'admin@khetify.com' });
        const rajan = await User.findOne({ phone: '9793789199' });

        const token = jwt.sign(
            { id: admin._id, role: admin.role, name: admin.name },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );

        console.log('Admin Token Generated');
        
        const initialCount = await Transaction.countDocuments({ recipient: rajan._id });
        console.log('Initial Transactions for Rajan:', initialCount);

        // Process a small payout
        console.log('Processing payout for Rajan...');
        const res = await axios.post('http://192.168.31.124:5500/api/employee/admin/process-payout', {
            id: rajan._id,
            amount: 5,
            utrNumber: 'TEST-VERIFY-' + Date.now(),
            note: 'Verification test for history logging'
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Payout API Response:', res.status, res.data);

        // Check if transaction was created
        const newCount = await Transaction.countDocuments({ recipient: rajan._id });
        console.log('New Transactions for Rajan:', newCount);

        const latestTx = await Transaction.findOne({ recipient: rajan._id }).sort({ createdAt: -1 }).lean();
        console.log('Latest Transaction:', JSON.stringify(latestTx, null, 2));

        if (newCount > initialCount && latestTx.module === 'Platform') {
            console.log('SUCCESS: Payout history successfully logged!');
        } else {
            console.log('FAILURE: Payout history not logged correctly.');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('VERIFICATION ERROR:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

verifyHistory();
