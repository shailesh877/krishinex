const http = require('http');
const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const jwt = require(path.join(__dirname, '../backend/node_modules/jsonwebtoken'));
const MilkPauseRequest = require(path.join(__dirname, '../backend/models/MilkPauseRequest'));
const MilkConfig = require(path.join(__dirname, '../backend/models/MilkConfig'));

const JWT_SECRET = process.env.JWT_SECRET || 'khetify_jwt_secret_2026_secure';
const MONGO_URI = process.env.MONGODB_URI;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- 🧪 STARTING MILK PAUSE GOVERNANCE & ZERO-OVERWRITE AUDIT VERIFICATION ---');

  // Connect to DB directly to fetch/seed mock users for testing
  await mongoose.connect(MONGO_URI);

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const MilkSubscription = mongoose.model('MilkSubscription', new mongoose.Schema({}, { strict: false }));

  // Find or create test farmer user
  let farmer = await User.findOne({ role: 'farmer' });
  if (!farmer) {
    farmer = await User.create({ name: 'Audit Test Farmer', phone: '9998887711', role: 'farmer', walletBalance: 5000 });
  }

  // Find or create test admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({ name: 'Audit Super Admin', phone: '9998887722', role: 'admin' });
  }

  const farmerToken = jwt.sign({ id: farmer._id }, JWT_SECRET, { expiresIn: '1d' });
  const adminToken = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });

  console.log('✅ Tokens Generated for Farmer & Admin');

  // STEP 1: Update Global Config via Admin API
  console.log('\n--- Step 1: PUT /api/milk/admin/config (Setting 24h Notice, 7 Days Auto Limit) ---');
  const configRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/admin/config',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    minAdvancePauseHours: 24,
    minAdvancePauseDays: 1,
    maxAutoApprovePauseDays: 7,
    defaultSellRate: 46,
    defaultBuyRate: 62,
    withdrawalCycleDays: 7
  });

  console.log('Config Update Status:', configRes.status);
  console.log('Saved Config:', {
    minAdvancePauseHours: configRes.data?.config?.minAdvancePauseHours,
    minAdvancePauseDays: configRes.data?.config?.minAdvancePauseDays,
    maxAutoApprovePauseDays: configRes.data?.config?.maxAutoApprovePauseDays
  });

  // STEP 2: Create or Get Active Subscription for Farmer
  let sub = await MilkSubscription.findOne({ userId: farmer._id, type: 'buy', status: 'approved' });
  if (!sub) {
    sub = await MilkSubscription.create({
      userId: farmer._id,
      type: 'buy',
      name: farmer.name,
      phone: farmer.phone,
      address: 'Plot 45, Greenfield Farms',
      dailyQuantityLiters: 4,
      deliverySchedule: 'Morning Only',
      status: 'approved',
      ratePerLiter: 62
    });
  }

  console.log('\nActive Subscription:', sub._id.toString());

  // STEP 3: Test Insufficient Advance Notice (< 24 Hours)
  console.log('\n--- Step 3: Testing Pause with Insufficient Advance Notice (< 24 Hours) ---');
  const now = new Date();
  const tooSoonStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Only 2 hours in advance
  const tooSoonResume = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const failRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/pause',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    }
  }, {
    subscriptionId: sub._id.toString(),
    pauseStartDate: tooSoonStart.toISOString(),
    expectedResumeDate: tooSoonResume.toISOString(),
    pauseReason: 'Trying to pause immediately'
  });

  console.log('Expected Rejection Status (should be 400):', failRes.status);
  console.log('Error Message Received:', failRes.data?.error);
  if (failRes.status === 400) {
    console.log('✅ PASS: Insufficient notice correctly rejected!');
  } else {
    console.error('❌ FAIL: Insufficient notice was not rejected');
  }

  // STEP 4: Test Valid Auto-Approved Pause (28 hours advance, 4 days duration <= 7 days)
  console.log('\n--- Step 4: Testing Valid Auto-Approved Pause (28h advance, 4 days duration) ---');
  const validStart = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const validResume = new Date(validStart.getTime() + 4 * 24 * 60 * 60 * 1000);

  const pauseRes1 = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/pause',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    }
  }, {
    subscriptionId: sub._id.toString(),
    pauseStartDate: validStart.toISOString(),
    expectedResumeDate: validResume.toISOString(),
    pauseReason: 'Family vacation (Auto-approved request 1)'
  });

  console.log('Pause 1 Status:', pauseRes1.status);
  console.log('Auto Approved:', pauseRes1.data?.autoApproved);
  console.log('Pause Record 1 ID:', pauseRes1.data?.pauseRecord?._id);

  // STEP 5: Test Extending Pause
  console.log('\n--- Step 5: Testing Pause Extension ---');
  const extendedResume = new Date(validStart.getTime() + 6 * 24 * 60 * 60 * 1000); // 6 days total <= 7 days

  const extendRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/extend-pause',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    }
  }, {
    subscriptionId: sub._id.toString(),
    newResumeDate: extendedResume.toISOString(),
    reason: 'Extending vacation by 2 days'
  });

  console.log('Extend Status:', extendRes.status);
  console.log('Extension Result Message:', extendRes.data?.message);

  // STEP 6: Resume Service
  console.log('\n--- Step 6: Testing Resuming Service (Must NOT overwrite or delete history) ---');
  const resumeRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/resume',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    }
  }, {
    subscriptionId: sub._id.toString()
  });

  console.log('Resume Status:', resumeRes.status);
  console.log('Resume Message:', resumeRes.data?.message);

  // STEP 7: Submit a SECOND Pause Request Later
  console.log('\n--- Step 7: Submitting a 2nd Pause Request Later (Long Pause: 12 days > 7 days) ---');
  const secondStart = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const secondResume = new Date(secondStart.getTime() + 12 * 24 * 60 * 60 * 1000); // 12 days > 7 days -> Admin review

  const pauseRes2 = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/pause',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    }
  }, {
    subscriptionId: sub._id.toString(),
    pauseStartDate: secondStart.toISOString(),
    expectedResumeDate: secondResume.toISOString(),
    pauseReason: 'Extended travel for 12 days (Requires Admin Approval)'
  });

  console.log('Pause 2 Status:', pauseRes2.status);
  console.log('Auto Approved (should be false):', pauseRes2.data?.autoApproved);
  console.log('Message:', pauseRes2.data?.message);
  console.log('Pause Record 2 ID:', pauseRes2.data?.pauseRecord?._id);

  // STEP 8: Admin Approves the Long Pause
  console.log('\n--- Step 8: Admin Approves 12-day Pause Request ---');
  const reviewRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: `/api/milk/admin/subscriptions/${sub._id.toString()}/review-pause`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    action: 'approved',
    adminRemarks: 'Approved by senior dairy manager after checking travel notes'
  });

  console.log('Admin Review Status:', reviewRes.status);
  console.log('Message:', reviewRes.data?.message);

  // STEP 9: Fetch Complete Audit Ledger via Admin API
  console.log('\n--- Step 9: Querying GET /api/milk/admin/pause-history (Permanent Audit Ledger) ---');
  const historyRes = await request({
    hostname: '127.0.0.1',
    port: 5500,
    path: '/api/milk/admin/pause-history?status=all&type=all',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  console.log('Audit Ledger Status:', historyRes.status);
  console.log('Audit Summary KPI:', historyRes.data?.summary);

  const subscriberRecords = historyRes.data?.history.filter(h => h.subscriptionId === sub._id.toString());
  console.log(`\nTotal Pause Records Found for this Subscription: ${subscriberRecords.length}`);

  subscriberRecords.forEach((rec, idx) => {
    console.log(`\n  [Record #${idx + 1}]`);
    console.log(`  ID: ${rec._id}`);
    console.log(`  Requested At: ${rec.requestedAt}`);
    console.log(`  Advance Notice Hours: ${rec.advanceNoticeHours}h`);
    console.log(`  Duration Days: ${rec.pauseDurationDays} days`);
    console.log(`  Approval Status: ${rec.approvalStatus}`);
    console.log(`  Lifecycle Status: ${rec.lifecycleStatus}`);
    console.log(`  Actual Resumed Date: ${rec.actualResumedDate || 'Not resumed yet (active)'}`);
    console.log(`  Extensions Recorded: ${rec.extensionHistory?.length || 0}`);
    console.log(`  Reason: ${rec.pauseReason}`);
    console.log(`  Admin Remarks: ${rec.adminRemarks || 'N/A'}`);
  });

  if (subscriberRecords.length >= 2) {
    console.log('\n🌟 ZERO DATA LOSS CONFIRMED: Multiple past pause requests are preserved independently without overwrite!');
  } else {
    console.error('\n❌ WARNING: Expected at least 2 permanent records, found:', subscriberRecords.length);
  }

  await mongoose.disconnect();
  console.log('\n--- 🏁 VERIFICATION COMPLETE ---');
}

runTest().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
