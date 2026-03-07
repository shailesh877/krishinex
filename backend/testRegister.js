const formData = new FormData();
formData.append('role', 'buyer');
formData.append('name', 'Bhai Buyer');
formData.append('phone', '9876543210');
formData.append('address', 'New Delhi');

fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: formData
})
    .then(res => res.json())
    .then(data => console.log('Registration Response:', data))
    .catch(err => console.error('Error:', err));
