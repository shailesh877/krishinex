require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./models/Transaction');
const User = require('./models/User');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const ksp = await User.findOne({ name: /Rajan giti/i, role: 'ksp' });
    if (!ksp) {
      console.log('KSP "Rajan giti" not found');
      // List all KSPs to be helpful
      const ksps = await User.find({ role: 'ksp' }).select('name phone');
      console.log('Available KSPs:', ksps.map(k => `${k.name} (${k.phone})`));
      process.exit();
    }

    console.log(`KSP FOUND: Name: ${ksp.name}, ID: ${ksp._id}, Phone: ${ksp.phone}`);

    // Test the recipient only filter (what I implemented)
    const filtered = await Transaction.find({ recipient: ksp._id }).sort({ createdAt: -1 }).limit(10);
    console.log(`\n--- FILTERED (RECIPIENT ONLY: ${ksp._id}) ---`);
    console.log(`Count: ${filtered.length}`);
    filtered.forEach(t => {
      console.log(`[${t.type}] ID: ${t.transactionId}, Amt: ${t.amount}, Recipient: ${t.recipient}, Note: ${t.note}`);
    });

    // Test the original filter (what was there before)
    const original = await Transaction.find({
      $or: [
        { recipient: ksp._id },
        { performedBy: ksp._id }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    console.log(`\n--- ORIGINAL (RECIPIENT OR PERFORMEDBY) ---`);
    console.log(`Count: ${original.length}`);
    original.forEach(t => {
        console.log(`[${t.type}] ID: ${t.transactionId}, Amt: ${t.amount}, Recipient: ${t.recipient}, PerformedBy: ${t.performedBy}, Note: ${t.note}`);
    });

    // Find the specific Admin credit transactions seen in screenshot (+400)
    const plus400 = await Transaction.find({ amount: 400, type: 'Credit' }).sort({ createdAt: -1 }).limit(5);
    console.log(`\n--- RECENT +400 CREDIT TRANSACTIONS ---`);
    plus400.forEach(t => {
        console.log(`ID: ${t.transactionId}, Recipient: ${t.recipient}, PerformedBy: ${t.performedBy}, Note: ${t.note}`);
    });

  } catch (err) {
    console.error('Debug Error:', err);
  } finally {
    process.exit();
  }
}

debug();
