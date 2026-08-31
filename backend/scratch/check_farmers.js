const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await mongoose.connection.db.collection('users').countDocuments({ role: { $in: ['farmer', 'buyer', 'user'] } });
  const all = await mongoose.connection.db.collection('users').find({ role: { $in: ['farmer', 'buyer', 'user'] } }).toArray();
  console.log('FARMER/BUYER COUNT:', count);
  console.log('SAMPLE FARMERS:', all.slice(0, 3).map(u => ({ id: u._id, name: u.name, role: u.role, aadhaarFront: u.aadhaarDocUrl, aadhaarBack: u.aadhaarBackDocUrl })));
  process.exit();
}
run();
