try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('DNS setServers failed (skipping):', e.message);
}

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Order = require('../models/Order');
const Settings = require('../models/Settings');

const parseQuantityInQuintals = (qtyStr) => {
    if (!qtyStr) return 0;
    const str = String(qtyStr);
    const quintalMatch = str.match(/\(?([\d.]+)\s*Quintal\)?/i);
    if (quintalMatch) return parseFloat(quintalMatch[1]) || 0;
    if (str.toLowerCase().includes('quintal')) return parseFloat(str) || 0;
    if (str.toLowerCase().includes('kg')) return (parseFloat(str) || 0) / 100;
    return parseFloat(str) || 0;
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const settings = await Settings.getSettings();
        const globalCommissionRate = settings.commissions.buyerTrading || 0;

        const karmanId = '69be46fbd163eed828fa6711';
        const orders = await Order.find({ buyer: karmanId }).lean();

        console.log('\n=== INDIVIDUAL ORDER CALCULATIONS FOR KISHAN ===');
        orders.forEach(o => {
            if (o.status !== 'cancelled') {
                const qty = parseQuantityInQuintals(o.quantity);
                const commission = o.commission !== undefined && o.commission !== null ? o.commission : (qty * (o.pricePerQuintal || 0) * globalCommissionRate / 100);
                const farmerPayout = o.farmerAmount || (qty * (o.pricePerQuintal || 0));
                const totalPayable = farmerPayout + commission;
                const amountReceived = o.amountReceived || 0;
                const pending = Math.max(0, totalPayable - amountReceived);

                console.log(`Order ID: ${o._id}`);
                console.log(`  status: "${o.status}"`);
                console.log(`  quantity: "${o.quantity}" -> qty: ${qty} Q`);
                console.log(`  pricePerQuintal: ${o.pricePerQuintal}`);
                console.log(`  commission: ${commission}`);
                console.log(`  farmerAmount/Payout: ${farmerPayout}`);
                console.log(`  totalPayable: ${totalPayable}`);
                console.log(`  amountReceived: ${amountReceived}`);
                console.log(`  pendingAmount: ${pending}`);
            }
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
