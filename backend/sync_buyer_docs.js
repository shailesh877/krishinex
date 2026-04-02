require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BUYER_ID = '69a47fc2917d49d795fb4b70';

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const buyer = await User.findById(BUYER_ID);
        if (!buyer) {
            console.error('Buyer not found');
            process.exit(1);
        }

        console.log('Current DB Aadhaar:', buyer.aadhaarDocUrl);

        // Find all files in uploads starting with aadhaar_69a47fc2917d49d795fb4b70
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(uploadsDir);
        const userFiles = files.filter(f => f.startsWith(`aadhaar_${BUYER_ID}`));

        if (userFiles.length > 0) {
            // Sort by timestamp (the part after the last underscore)
            userFiles.sort((a, b) => {
                const tsA = parseInt(a.split('_').pop().split('.')[0]);
                const tsB = parseInt(b.split('_').pop().split('.')[0]);
                return tsB - tsA; // Newest first
            });

            const latestFile = 'uploads/' + userFiles[0];
            console.log('Latest Found on Disk:', latestFile);

            if (buyer.aadhaarDocUrl !== latestFile) {
                buyer.aadhaarDocUrl = latestFile;
                await buyer.save();
                console.log('SUCCESS: Database updated to point to latest file.');
            } else {
                console.log('INFO: Database already points to the latest file.');
            }
        } else {
            console.error('ERROR: No Aadhaar files found on disk for this user.');
        }

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
