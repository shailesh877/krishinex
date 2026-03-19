const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ShopOrder = require('./models/ShopOrder');
const Rental = require('./models/Rental');
const Order = require('./models/Order');
const SoilRequest = require('./models/SoilRequest');
const Transaction = require('./models/Transaction');

dotenv.config();

async function reconcile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('--- Reconciling Shop Orders ---');
        const shopOrders = await ShopOrder.find({ status: 'DELIVERED' });
        for (const order of shopOrders) {
            const hasTx = await Transaction.findOne({ referenceId: order._id });
            if (!hasTx) {
                const owner = await User.findById(order.owner);
                if (owner) {
                    const amount = order.totalAmount || 0;
                    owner.walletBalance = (owner.walletBalance || 0) + amount;
                    await owner.save();
                    await Transaction.create({
                        transactionId: `RECON-SHOP-${order._id}`,
                        recipient: owner._id,
                        module: 'Shop',
                        amount,
                        type: 'Payout',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: order._id,
                        note: `RECON: Payment for Order #${order._id.toString().slice(-6)}`
                    });
                    console.log(`Credited ${amount} to ${owner.name} for Shop Order ${order._id}`);
                }
            }
        }

        console.log('--- Reconciling Machine Rentals ---');
        const rentals = await Rental.find({ status: 'Completed' });
        for (const rental of rentals) {
            const hasTx = await Transaction.findOne({ referenceId: rental._id });
            if (!hasTx) {
                const owner = await User.findById(rental.owner);
                if (owner) {
                    const amount = rental.totalAmount || 0;
                    owner.walletBalance = (owner.walletBalance || 0) + amount;
                    await owner.save();
                    await Transaction.create({
                        transactionId: `RECON-RENT-${rental._id}`,
                        recipient: owner._id,
                        module: 'Equipment',
                        amount,
                        type: 'Payout',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: rental._id,
                        note: `RECON: Payment for Rental #${rental._id.toString().slice(-6)}`
                    });
                    console.log(`Credited ${amount} to ${owner.name} for Rental ${rental._id}`);
                }
            }
        }

        console.log('--- Reconciling Labour Bookings ---');
        const orders = await Order.find({ assignedStatus: { $in: ['delivered', 'completed'] } });
        for (const o of orders) {
            const hasTx = await Transaction.findOne({ referenceId: o._id });
            if (!hasTx) {
                const partner = await User.findById(o.assignedTo);
                if (partner) {
                    const amount = o.amount || 0;
                    partner.walletBalance = (partner.walletBalance || 0) + amount;
                    await partner.save();
                    await Transaction.create({
                        transactionId: `RECON-LAB-${o._id}`,
                        recipient: partner._id,
                        module: 'Labour',
                        amount,
                        type: 'Payout',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: o._id,
                        note: `RECON: Payment for Job #${o._id.toString().slice(-6)}`
                    });
                    console.log(`Credited ${amount} to ${partner.name} for Job ${o._id}`);
                }
            }
        }

        console.log('--- Reconciling Soil Requests ---');
        const soilReqs = await SoilRequest.find({ status: 'Completed' });
        for (const req of soilReqs) {
            const hasTx = await Transaction.findOne({ referenceId: req._id });
            if (!hasTx) {
                const lab = await User.findById(req.lab);
                if (lab) {
                    const amount = req.price || 0;
                    lab.walletBalance = (lab.walletBalance || 0) + amount;
                    await lab.save();
                    await Transaction.create({
                        transactionId: `RECON-SOIL-${req._id}`,
                        recipient: lab._id,
                        module: 'Soil',
                        amount,
                        type: 'Payout',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: req._id,
                        note: `RECON: Payment for Soil Test #${req._id.toString().slice(-6)}`
                    });
                    console.log(`Credited ${amount} to ${lab.name} for Soil Test ${req._id}`);
                }
            }
        }

        console.log('Reconciliation complete!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Reconciliation failed:', err);
    }
}

reconcile();
