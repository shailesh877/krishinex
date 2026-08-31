const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const token = jwt.sign({ id: '69a47fc2917d49d795fb4b70', role: 'admin' }, process.env.JWT_SECRET || 'khetify_jwt_secret_2026_secure', { expiresIn: '1d' });

const options = {
    hostname: 'localhost',
    port: 5500,
    path: '/api/employee/admin/labours?all=true',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        try {
            const parsed = JSON.parse(data);
            console.log('Labourers count returned:', Array.isArray(parsed) ? parsed.length : parsed);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('First 5 labourers:', parsed.slice(0, 5).map(l => ({ _id: l._id, name: l.name, phone: l.phone, status: l.status })));
            }
        } catch (e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', err => console.error('Error:', err.message));
req.end();
