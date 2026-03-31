const fs = require('fs');
const path = 'd:/khetify/backend/routes/employeeRoutes.js';
let content = fs.readFileSync(path, 'utf8');

// List of routes to update from checkAdmin to checkModule
const updates = [
    // Labour
    { route: '/admin/labour/stats', method: 'get', key: 'labour' },
    { route: '/admin/labours', method: 'get', key: 'labour' },
    { route: '/admin/labour/jobs', method: 'get', key: 'labour' },
    { route: '/admin/labour/jobs/:id/assign', method: 'patch', key: 'labour' },
    { route: '/admin/labour/approve/:id', method: 'put', key: 'labour' },
    { route: '/admin/labour/reject/:id', method: 'put', key: 'labour' },
    { route: '/admin/labour/export', method: 'get', key: 'labour' },
    
    // Buyer / Trading
    { route: '/admin/approve/:id', method: 'put', key: 'buyer' },
    { route: '/admin/unblock/:id', method: 'put', key: 'buyer' },
    { route: '/admin/buyer/stats', method: 'get', key: 'buyer' },
    { route: '/admin/buyers', method: 'get', key: 'buyer' },
    { route: '/admin/buyer/requests', method: 'get', key: 'buyer' },
    { route: '/admin/buyer/reconciliation', method: 'get', key: 'buyer' },
    { route: '/admin/buyer/assign-farmer/:orderId', method: 'put', key: 'buyer' },

    // Franchise
    { route: '/admin/franchise-stats', method: 'get', key: 'ksp_franchise' },
    { route: '/admin/franchises', method: 'post', key: 'ksp_franchise' },
    { route: '/admin/franchises', method: 'get', key: 'ksp_franchise' }
];

updates.forEach(update => {
    // Regex matches e.g. router.get('/admin/labour/stats', protect, checkAdmin,
    const regex = new RegExp(`router\\.${update.method}\\('${update.route.replace(/\//g, '\\/')}', protect, checkAdmin`, 'g');
    const replacement = `router.${update.method}('${update.route}', protect, checkModule('${update.key}')`;
    
    if (content.match(regex)) {
        console.log(`Updating ${update.method.toUpperCase()} ${update.route} -> checkModule('${update.key}')`);
        content = content.replace(regex, replacement);
    } else {
        console.log(`Skipped (not found): ${update.method.toUpperCase()} ${update.route}`);
    }
});

fs.writeFileSync(path, content, 'utf8');
console.log('Backend employeeRoutes.js updated successfully!');
