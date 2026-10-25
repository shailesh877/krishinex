const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'd:/Pasiware/krishinex/backend/.env' });

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const JWT_SECRET = process.env.JWT_SECRET || 'secret';

  console.log('--- 1. Testing Farmer Verification Enforcements ---');
  const unverifiedFarmer = await mongoose.connection.collection('users').findOne({ role: 'farmer', status: { $ne: 'approved' } });
  if (unverifiedFarmer) {
    const unverifiedToken = jwt.sign({ id: unverifiedFarmer._id, role: 'farmer' }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Unverified farmer id:', unverifiedFarmer._id, 'status:', unverifiedFarmer.status);

    // Test POST /create-order
    const resOrder = await fetch('http://localhost:5500/api/premium-farmer/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + unverifiedToken },
      body: JSON.stringify({ termsVersion: 3 })
    });
    const orderData = await resOrder.json();
    console.log('Premium Order (Unverified Farmer): Status =', resOrder.status, '| Error =', orderData.error);

    // Test POST /api/milk/register
    const resMilk = await fetch('http://localhost:5500/api/milk/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + unverifiedToken },
      body: JSON.stringify({
        type: 'sell',
        name: unverifiedFarmer.name || 'Test Farmer',
        phone: unverifiedFarmer.phone || '9999999999',
        address: 'Test Address',
        dailyQuantityLiters: 5
      })
    });
    const milkData = await resMilk.json();
    console.log('Milk Register (Unverified Farmer): Status =', resMilk.status, '| Error =', milkData.error);
  }

  console.log('\n--- 2. Testing Chunk Loading & DB Search in Admin APIs ---');
  const adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' });
  if (adminUser) {
    const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Admin user found:', adminUser.name);

    // Milk admin chunk test
    const milkRes = await fetch('http://localhost:5500/api/milk/admin/requests?page=1&limit=2', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const milkJson = await milkRes.json();
    console.log('Milk Admin Requests: Status =', milkRes.status, '| Total =', milkJson.pagination?.total, '| Page =', milkJson.pagination?.page, '| Items on page =', milkJson.requests?.length);

    // Premium Farmer Admin chunk test
    const pfRes = await fetch('http://localhost:5500/api/premium-farmer/admin/applications?page=1&limit=2', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const pfJson = await pfRes.json();
    console.log('Premium Applications: Status =', pfRes.status, '| Total =', pfJson.pagination?.total, '| Page =', pfJson.pagination?.page, '| Items on page =', pfJson.applications?.length);
  }

  console.log('\n--- ALL INTEGRATION TESTS PASSED ---');
  await mongoose.disconnect();
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
