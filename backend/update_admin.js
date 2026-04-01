const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');

const updateAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const oldEmail = 'admin@khetify.com';
    const newEmail = 'admin@krishinex.com';

    // Find the admin user with the old email
    const admin = await User.findOne({ email: oldEmail, role: 'admin' });

    if (!admin) {
      console.log(`[AUTH] Admin user with email ${oldEmail} not found.`);
      // Check if already updated
      const alreadyUpdated = await User.findOne({ email: newEmail, role: 'admin' });
      if (alreadyUpdated) {
        console.log(`[AUTH] Admin user already has email ${newEmail}. Skipping.`);
        process.exit(0);
      }
      
      // If we still can't find it, try finding any admin and update it
      const anyAdmin = await User.findOne({ role: 'admin' });
      if (anyAdmin) {
        console.log(`[AUTH] Found admin with email ${anyAdmin.email}. Updating to ${newEmail}...`);
        anyAdmin.email = newEmail;
        await anyAdmin.save();
        console.log('[AUTH] Admin email updated successfully!');
      } else {
        console.log('[AUTH] No admin user found at all. Please create an admin user first.');
      }
      process.exit(0);
    }

    console.log(`[AUTH] Updating admin email from ${oldEmail} to ${newEmail}...`);
    admin.email = newEmail;
    await admin.save();

    console.log('[AUTH] Admin email updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[AUTH] Error updating admin email:', error);
    process.exit(1);
  }
};

updateAdmin();
