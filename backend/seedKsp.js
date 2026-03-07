require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Item = require('./models/Item');
const ShopOrder = require('./models/ShopOrder');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('Could not connect to MongoDB', err);
        process.exit(1);
    });

const seedKSP = async () => {
    try {
        console.log('Clearing old KSP data...');
        // Clear KSP users
        const ksps = await User.find({ role: 'ksp' });
        const kspIds = ksps.map(k => k._id);

        await Item.deleteMany({ owner: { $in: kspIds } });
        await ShopOrder.deleteMany({ owner: { $in: kspIds } });
        await User.deleteMany({ role: 'ksp' });

        console.log('Creating Farmer users...');
        let farmer1 = await User.findOne({ phone: '9000000001' });
        if (!farmer1) {
            farmer1 = await User.create({
                role: 'buyer',
                name: 'Ramkishan',
                phone: '9000000001',
                address: 'Karnal, Haryana',
                status: 'approved'
            });
        }

        console.log('Creating KSP Franchises...');
        const franchises = await User.create([
            {
                role: 'ksp',
                name: 'Rajesh Kumar',
                businessName: 'Krishi Seva Kendra',
                phone: '9800011000',
                address: 'Karnal, Haryana',
                status: 'approved',
                walletBalance: 120000
            },
            {
                role: 'ksp',
                name: 'Mohan Lal',
                businessName: 'Mohan Agro Center',
                phone: '9800022000',
                address: 'Panipat, Haryana',
                status: 'approved',
                walletBalance: 45000
            },
            {
                role: 'ksp',
                name: 'Suresh Tyagi',
                businessName: 'Tyagi Fertilizers',
                phone: '9800033000',
                address: 'Sonipat, Haryana',
                status: 'approved',
                walletBalance: 250000
            }
        ]);

        console.log('Creating Live Stock Inventory...');
        const insertedItems = await Item.create([
            // Franchise 1 Items
            { owner: franchises[0]._id, name: 'DAP Fertilizer', category: 'fert', price: 1200, unit: 'BAG', stockQty: 420 },
            { owner: franchises[0]._id, name: 'Urea', category: 'fert', price: 280, unit: 'BAG', stockQty: 680 },
            { owner: franchises[0]._id, name: 'NPK', category: 'fert', price: 1500, unit: 'BAG', stockQty: 8 }, // Low stock
            { owner: franchises[0]._id, name: 'Wheat Seeds', category: 'seed', price: 400, unit: 'KG', stockQty: 180 },

            // Franchise 2 Items
            { owner: franchises[1]._id, name: 'Mustard Seeds', category: 'seed', price: 600, unit: 'KG', stockQty: 45 },
            { owner: franchises[1]._id, name: 'Rice Seeds', category: 'seed', price: 350, unit: 'KG', stockQty: 240 },
            { owner: franchises[1]._id, name: 'Super NPK', category: 'fert', price: 1600, unit: 'BAG', stockQty: 5 }, // Low stock

            // Franchise 3 Items
            { owner: franchises[2]._id, name: 'Cattle Feed', category: 'tool', price: 800, unit: 'BAG', stockQty: 520 },
            { owner: franchises[2]._id, name: 'Mineral Mix', category: 'tool', price: 1100, unit: 'BAG', stockQty: 180 }
        ]);

        console.log('Creating Sales Ledger (Farmer Transactions)...');
        await ShopOrder.create([
            {
                buyer: farmer1._id,
                owner: franchises[0]._id,
                items: [
                    { itemRef: insertedItems[0]._id, name: insertedItems[0].name, price: insertedItems[0].price, quantity: 2, unit: insertedItems[0].unit }
                ],
                totalAmount: 2400,
                status: 'DELIVERED',
                paymentMode: 'WALLET'
            },
            {
                buyer: farmer1._id,
                owner: franchises[1]._id,
                items: [
                    { itemRef: insertedItems[4]._id, name: insertedItems[4].name, price: insertedItems[4].price, quantity: 1, unit: insertedItems[4].unit }
                ],
                totalAmount: 600,
                status: 'DELIVERED',
                paymentMode: 'CASH'
            },
            {
                buyer: farmer1._id,
                owner: franchises[0]._id,
                items: [
                    { itemRef: insertedItems[2]._id, name: insertedItems[2].name, price: insertedItems[2].price, quantity: 5, unit: insertedItems[2].unit }
                ],
                totalAmount: 7500,
                status: 'DELIVERED',
                paymentMode: 'CASH'
            }
        ]);

        console.log('Data seeding completed successfully!');
        process.exit();
    } catch (e) {
        console.error('Data seeding failed!', e);
        process.exit(1);
    }
};

seedKSP();
