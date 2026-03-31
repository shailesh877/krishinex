const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testSignup() {
    try {
        const form = new FormData();
        form.append('role', 'farmer');
        form.append('name', 'Test Farmer Three');
        form.append('phone', '7777777777');
        form.append('address', 'Test Addr');
        form.append('aadhaarNumber', '999999999999');
        form.append('email', '');

        // Create a dummy file for the aadhaarDoc
        fs.writeFileSync('dummy.pdf', 'dummy content');
        form.append('aadhaarDoc', fs.createReadStream('dummy.pdf'));

        console.log('Sending request...');
        const response = await axios.post('https://demo.ranx24.com/api/auth/register', form, {
            headers: form.getHeaders()
        });

        console.log('Success:', response.status);
        console.log(response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Network Error:', error.message);
        }
    } finally {
        if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
    }
}

testSignup();
