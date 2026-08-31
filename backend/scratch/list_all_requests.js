const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Order = require('../models/Order');
const SellRequest = require('../models/SellRequest');
const User = require('../models/User');

async function run() {
    try {
        try {
            require('dns').setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            console.warn('DNS setServers failed:', dnsErr.message);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const requests = await SellRequest.find({}).populate('farmer').lean();
        console.log(`Total Sell Requests in DB: ${requests.length}`);
        
        requests.forEach((req, index) => {
            console.log(`[${index}] ID: ${req._id}, Status: ${req.status}, Farmer: ${req.farmer ? req.farmer.name : 'null'}, expectedPrice: ${req.expectedPrice}`);
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
