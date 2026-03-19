
const express = require('express');
const app = express();

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shopRoutes = require('./routes/shopRoutes');

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

function printRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            console.log(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            let newPrefix = prefix + (layer.regexp.source.replace('^', '').replace('\\/?(?=\\/|$)', '').replace('\\/', '/').replace('\\', ''));
            // regexp for router mounting usually looks like \/api\/employee\/?(?=\/|$)
            // simplified for logging:
            if (newPrefix.includes('api/employee')) newPrefix = '/api/employee';
            else if (newPrefix.includes('api/auth')) newPrefix = '/api/auth';
            // ... etc
            printRoutes(layer.handle.stack, newPrefix);
        }
    });
}

console.log('--- ALL REGISTERED ROUTES ---');
printRoutes(app._router.stack);
