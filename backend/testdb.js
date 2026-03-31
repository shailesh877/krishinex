const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/khetify');
  const Rental = require('./models/Rental');
  const rs = await Rental.find().sort({createdAt: -1}).limit(5);
  console.log(JSON.stringify(rs, null, 2));
  process.exit(0);
}

test();
