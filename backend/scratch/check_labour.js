const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed:', e.message);
}

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const labourId = '69d63adc0eded1eafaa07ada';

        // 1. Reset user state to simulate initial bug state
        console.log('Resetting user fields to initial state...');
        await User.findByIdAndUpdate(labourId, {
            name: 'hellow',
            businessName: 'Rohit ',
            'labourDetails.skillDescription': ''
        });

        // 2. Generate a valid admin token
        const token = jwt.sign({ id: labourId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 3. Make HTTP PUT request to local backend server
        console.log('Sending PUT request to backend update route...');
        const updateRes = await axios.put(`http://localhost:5500/api/employee/admin/labour/update/${labourId}`, {
            name: 'Rohit Paswan',
            phone: '6200049943',
            aadhaarNumber: '235689986532',
            address: 'Madhopur Samastipur bibhutipur bihar',
            bankDetails: {
                holderName: 'Rohit',
                bankName: 'SBI',
                accountNumber: '12345678',
                ifscCode: 'SBIN000123'
            },
            skillDescription: 'Excellent farm worker'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('API Response status:', updateRes.status);

        // 4. Fetch the labourers list via GET API
        console.log('Fetching labourers list via GET API...');
        const listRes = await axios.get('http://localhost:5500/api/employee/admin/labours', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const updatedLabourer = listRes.data.find(l => l._id === labourId);
        console.log('Fetched Labourer from GET API:', {
            name: updatedLabourer.name,
            labourDetails: updatedLabourer.labourDetails
        });

        if (updatedLabourer.labourDetails && updatedLabourer.labourDetails.skillDescription === 'Excellent farm worker') {
            console.log('✅ SUCCESS: labourDetails.skillDescription is correctly returned by the GET API!');
        } else {
            console.log('❌ FAILURE: labourDetails.skillDescription was not returned in the GET API response!');
        }

    } catch (e) {
        console.error('Test error:', e.response ? e.response.data : e.message);
    } finally {
        mongoose.connection.close();
    }
}

run();
