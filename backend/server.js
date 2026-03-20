const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
console.log('--- KHETIFY BACKEND V2.2 (OTP & WALLET FIX) ---');

// DNS Fix for MongoDB SRV on some networks
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shopRoutes = require('./routes/shopRoutes'); // Added shopRoutes import

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
    next();
});

// Top-level test route
app.get('/api/test-direct', (req, res) => {
    res.json({ message: 'Direct server.js route working' });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Admin Panel statically
app.use('/admin', express.static(path.join(__dirname, '../khetify_admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/machines', require('./routes/machineRoutes'));
app.use('/api/rentals', require('./routes/rentalRoutes'));
app.use('/api/soil', require('./routes/soilRoutes'));
app.use('/api/shop', shopRoutes);
app.use('/api/mandi', require('./routes/mandiRoutes'));
app.use('/api/sell', require('./routes/sellRoutes'));
app.use('/api/labour', require('./routes/labourRoutes'));
app.use('/api/employee', require('./routes/employeeRoutes'));
app.use('/api/field', require('./routes/fieldRoutes'));
app.use('/api/franchise', require('./routes/franchiseRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/ksp', require('./routes/kspRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/suggestions', require('./routes/suggestionRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    const errorMsg = `[${new Date().toISOString()}] 500_ERROR: ${err.message}\nStack: ${err.stack}\nURL: ${req.method} ${req.url}\n\n`;
    require('fs').appendFileSync('server_error.txt', errorMsg);
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });
