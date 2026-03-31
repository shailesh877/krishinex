const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Rental = require('./models/Rental');
const LabourJob = require('./models/LabourJob');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to DB');
    const rentals = await Rental.find().sort({ createdAt: -1 }).limit(3);
    console.log('RECENT RENTALS:');
    console.log(JSON.stringify(rentals, null, 2));

    const labours = await LabourJob.find().sort({ createdAt: -1 }).limit(3);
    console.log('RECENT LABOURS:');
    console.log(JSON.stringify(labours, null, 2));

    process.exit(0);
  });
