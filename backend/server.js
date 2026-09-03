if (!global.crypto) {
    global.crypto = require('crypto');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

console.log('--- KHETIFY BACKEND V2.5 (BUGFIX TEST) ---');

// DNS Fix for MongoDB SRV on some networks
try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed (skipping):', e.message);
}

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shopRoutes = require('./routes/shopRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'https://admin.krishinex.com',
            'https://demo.ranx24.com',
            'https://krishinex.com',
            'https://www.krishinex.com',
            'http://localhost:5500',
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:3000'
        ];
        const isLocalIp = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (allowedOrigins.indexOf(origin) !== -1 || isLocalIp) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS: ' + origin));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.io
const io = new Server(server, { cors: corsOptions });

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Missing token'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error: Invalid token'));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] User connected: ${socket.user.id} (${socket.user.role})`);
    socket.join(`user_${socket.user.id}`);
    socket.on('disconnect', () => {
        console.log(`🔌 [Socket.io] User disconnected: ${socket.user.id}`);
    });
});

global.io = io;

// LOUD GLOBAL REQUEST LOGGER
app.use((req, res, next) => {
    console.log('\n======================================================');
    console.log(`🚨 PING RECEIVED: ${req.method} ${req.url}`);
    console.log(`🚨 FROM IP: ${req.ip} | ORIGIN: ${req.headers.origin}`);
    console.log('======================================================\n');
    next();
});

// Top-level test route
app.get('/api/test-direct', (req, res) => {
    res.json({ message: 'UNIQUE_TEST_777_SUCCESS' });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Admin Panel statically
app.use('/admin', express.static(path.join(__dirname, '../krishinex-admin')));

// Serve KrishiNex landing page statically
app.use('/', express.static(path.join(__dirname, '../KrishiNex')));

// Routes
app.use('/api/machines', require('./routes/machineRoutes'));
app.use('/api/auth', authRoutes);
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
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
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/ads', require('./routes/adRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use('/api/nex-cards', require('./routes/nexCardRoutes'));

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
    .then(async () => {
        console.log('Connected to MongoDB');

        // Drop the old unique/sparse email index if it exists
        try {
            await mongoose.connection.collection('users').dropIndex('email_1_role_1');
            console.log('Successfully dropped old email_1_role_1 index');
        } catch (e) {
            console.log('Old email_1_role_1 index not found or already dropped:', e.message);
        }

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server & Socket.io running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });