// seed_farmers.js - Dummy data for Farmers & Users Management testing
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishinex';

const FARMERS = [
    { name: 'Rajesh Kumar', phone: '9811100101', email: 'rajesh@test.com', address: 'Karnal, Haryana', status: 'approved', aadhaarNumber: '1234-5678-9012' },
    { name: 'Sunita Devi', phone: '9822200202', email: 'sunita@test.com', address: 'Kanpur, Uttar Pradesh', status: 'approved', aadhaarNumber: '2345-6789-0123' },
    { name: 'Harpal Singh', phone: '9833300303', email: '', address: 'Ludhiana, Punjab', status: 'pending', aadhaarNumber: '' },
    { name: 'Meena Patel', phone: '9844400404', email: 'meena@test.com', address: 'Ahmedabad, Gujarat', status: 'approved', aadhaarNumber: '3456-7890-1234' },
    { name: 'Balram Yadav', phone: '9855500505', email: '', address: 'Patna, Bihar', status: 'pending', aadhaarNumber: '' },
    { name: 'Gita Sharma', phone: '9866600606', email: 'gita@test.com', address: 'Jaipur, Rajasthan', status: 'approved', aadhaarNumber: '4567-8901-2345' },
    { name: 'Mohan Lal', phone: '9877700707', email: '', address: 'Indore, Madhya Pradesh', status: 'rejected', aadhaarNumber: '5678-9012-3456' },
    { name: 'Priya Verma', phone: '9888800808', email: 'priya@test.com', address: 'Agra, Uttar Pradesh', status: 'approved', aadhaarNumber: '6789-0123-4567' },
    { name: 'Deepak Nair', phone: '9899900909', email: 'deepak@test.com', address: 'Thrissur, Kerala', status: 'pending', aadhaarNumber: '' },
    { name: 'Santosh Gupta', phone: '9810001010', email: '', address: 'Varanasi, Uttar Pradesh', status: 'approved', aadhaarNumber: '7890-1234-5678' },
];

const BUYERS = [
    { name: 'Vikram Traders', phone: '9700000001', email: 'vikram@trade.com', address: 'Karnal, Haryana', status: 'approved', businessName: 'Vikram Grain Traders' },
    { name: 'Harpreet Singh', phone: '9700000002', email: 'harpreet@trade.com', address: 'Panipat, Haryana', status: 'approved', businessName: 'Harpreet Agriculture' },
    { name: 'Delhi Agro Mart', phone: '9700000003', email: 'delhi@agro.com', address: 'New Delhi', status: 'approved', businessName: 'Delhi Agro Mart Pvt Ltd' },
];

const CROPS = ['Wheat', 'Rice', 'Mustard', 'Cotton', 'Soybean', 'Sugarcane', 'Maize'];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    // --- 1. Upsert Farmer (buyer role) users ---
    const farmerDocs = [];
    for (const f of FARMERS) {
        const query = { phone: f.phone };
        const existing = await User.findOneAndUpdate(
            query,
            { ...f, role: 'buyer' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        farmerDocs.push(existing);
        console.log(`👨‍🌾 Farmer upserted: ${f.name} (${f.status})`);
    }

    // --- 2. Upsert Buyer Partner users ---
    const buyerDocs = [];
    for (const b of BUYERS) {
        const existing = await User.findOneAndUpdate(
            { phone: b.phone },
            { ...b, role: 'buyer' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        buyerDocs.push(existing);
        console.log(`🤝 Buyer partner upserted: ${b.name}`);
    }

    // --- 3. Upsert Crop Sell Requests (Orders) ---
    const orderStatuses = ['pending', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled', 'pending'];

    for (let i = 0; i < farmerDocs.length; i++) {
        const farmer = farmerDocs[i];
        const crop = CROPS[i % CROPS.length];
        const status = orderStatuses[i % orderStatuses.length];
        const qty = String(Math.floor(Math.random() * 80) + 20);
        const rate = Math.floor(Math.random() * 3000) + 1500;
        const assignedTo = (status === 'accepted' || status === 'in-progress') ? buyerDocs[i % buyerDocs.length]._id : null;

        // 1 order per farmer
        const existingOrder = await Order.findOne({ buyer: farmer._id });
        if (!existingOrder) {
            await Order.create({
                buyer: farmer._id,
                farmerName: farmer.name,
                farmerMobile: farmer.phone,
                village: farmer.address.split(',')[0].trim(),
                district: farmer.address.split(',')[1]?.trim() || '',
                location: farmer.address,
                crop,
                quantity: qty,
                variety: '',
                pricePerQuintal: status === 'pending' ? 0 : rate,
                amount: status === 'completed' ? rate * parseInt(qty) : 0,
                status,
                assignedTo,
                note: `${crop} ready for pickup - Grade A quality`,
                imageUrl: '',
                createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // stagger dates
            });
            console.log(`📦 Order created: ${farmer.name} → ${crop} (${status})`);
        } else {
            console.log(`⚡ Order already exists for: ${farmer.name}`);
        }
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('Summary:');
    console.log(`  Farmers: ${farmerDocs.length}`);
    console.log(`  Buyer Partners: ${buyerDocs.length}`);
    console.log(`  Crop Orders: up to ${farmerDocs.length} created`);
    mongoose.connection.close();
}

seed().catch(e => { console.error('❌ Seed error:', e); mongoose.connection.close(); });
