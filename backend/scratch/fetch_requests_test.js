const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        const token = jwt.sign({ id: 'dummy_admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const headers = { 'Authorization': `Bearer ${token}` };

        const res = await axios.get('http://localhost:5500/api/employee/admin/crop-requests', { headers });
        const reqObj = res.data.find(r => r._id === '6a0d9fb412ea291d2c3ae620');
        console.log("Returned Request Object:", reqObj);
    } catch (e) {
        console.error(e.message);
    }
}

run();
