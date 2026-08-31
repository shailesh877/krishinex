const axios = require('axios');

async function testSubmit() {
    try {
        const payload = {
            fullName: 'Test Collab',
            shopName: 'Test Shop',
            phone: '9876543210',
            email: 'testcollab@gmail.com',
            address: '123 Test Street',
            city: 'Varanasi',
            state: 'Uttar Pradesh',
            pin: '221001'
        };

        console.log('Sending POST to https://demo.ranx24.com/api/ksp/submit...');
        const response = await axios.post('https://demo.ranx24.com/api/ksp/submit', payload);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Network Error:', error.message);
        }
    }
}

testSubmit();
