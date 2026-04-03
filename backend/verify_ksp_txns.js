const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./models/Transaction');
const User = require('./models/User');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const ksp = await User.findOne({ phone: '9455238860', role: 'ksp' }); // Using the phone from previous context or a known one
  if (!ksp) {
    console.log('KSP not found');
    process.exit();
  }

  console.log(`KSP ID: ${ksp._id}, Name: ${ksp.name}`);

  const txns = await Transaction.find({ recipient: ksp._id }).sort({ createdAt: -1 }).limit(10);
  console.log(`Found ${txns.length} transactions where KSP is recipient:`);
  txns.forEach(t => {
    console.log(`ID: ${t.transactionId}, Amt: ${t.amount}, Type: ${t.type}, Note: ${t.note}`);
  });

  const allRelated = await Transaction.find({
    $or: [
      { recipient: ksp._id },
      { performedBy: ksp._id }
    ]
  }).sort({ createdAt: -1 }).limit(10);
  
  console.log(`\nFound ${allRelated.length} transactions where KSP is recipient OR performedBy:`);
  allRelated.forEach(t => {
      console.log(`ID: ${t.transactionId}, Amt: ${t.amount}, Type: ${t.type}, Note: ${t.note}, Recipient: ${t.recipient}`);
  });

  process.exit();
}

debug();
