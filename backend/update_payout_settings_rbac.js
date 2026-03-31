const fs = require('fs');

// 1. Update employeeRoutes.js
const employeePath = 'd:/khetify/backend/routes/employeeRoutes.js';
let employeeContent = fs.readFileSync(employeePath, 'utf8');

const employeeUpdates = [
    // Payout Management
    { route: '/admin/search-users', method: 'get', key: 'payout' },
    { route: '/admin/process-payout', method: 'post', key: 'payout' },
    
    // Finance & Payouts (the stats/pending/etc)
    { route: '/admin/finance/stats', method: 'get', key: 'finance' },
    { route: '/admin/finance/pending', method: 'get', key: 'finance' },
    { route: '/admin/finance/approve', method: 'put', key: 'finance' },
    { route: '/admin/finance/transactions', method: 'get', key: 'finance' },
    { route: '/admin/finance/transactions/:id/status', method: 'put', key: 'finance' }
];

employeeUpdates.forEach(update => {
    const regex = new RegExp(`router\\.${update.method}\\('${update.route.replace(/\//g, '\\/')}', protect, checkAdmin`, 'g');
    const replacement = `router.${update.method}('${update.route}', protect, checkModule('${update.key}')`;
    
    if (employeeContent.match(regex)) {
        console.log(`Updating employeeRoutes: ${update.method.toUpperCase()} ${update.route} -> checkModule('${update.key}')`);
        employeeContent = employeeContent.replace(regex, replacement);
    } else {
        console.log(`Skipped employeeRoutes (not found): ${update.method.toUpperCase()} ${update.route}`);
    }
});
fs.writeFileSync(employeePath, employeeContent, 'utf8');

// 2. Update settingsRoutes.js
const settingsPath = 'd:/khetify/backend/routes/settingsRoutes.js';
let settingsContent = fs.readFileSync(settingsPath, 'utf8');

// All checkAdmin should be checkModule('settings') in this file
// router.get('/', protect, checkAdmin,
// router.put('/', protect, checkAdmin,
// router.put('/password', protect, checkAdmin,

const settingsRegex = /router\.(get|put)\('(.*?)', protect, checkAdmin/g;
const settingsReplacement = (match, method, route) => `router.${method}('${route}', protect, checkModule('settings')`;

if (settingsContent.match(settingsRegex)) {
    console.log('Updating settingsRoutes: Replacing checkAdmin with checkModule(\'settings\')');
    settingsContent = settingsContent.replace(settingsRegex, settingsReplacement);
    fs.writeFileSync(settingsPath, settingsContent, 'utf8');
} else {
    console.log('Skipped settingsRoutes (no checkAdmin found)');
}

console.log('RBAC updates for Payout, Settings, and Finance completed successfully!');
