/**
 * seedRental.js
 * Populates the database with dummy Equipment Rental bookings for testing.
 * Usage: node seedRental.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Machine = require('./models/Machine');
const Rental = require('./models/Rental');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khetify';

const COMMISSION_RATE = 0.05; // 5%

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // ── 1. Find or create an equipment provider ──────────────────────────
    let provider = await User.findOne({ role: 'equipment' });
    if (!provider) {
        provider = await User.create({
            role: 'equipment',
            name: 'Sharma Tractor Services',
            businessName: 'Sharma Tractor Services',
            phone: '9900011100',
            address: 'Karnal, Haryana',
            status: 'approved'
        });
        console.log('Created equipment provider:', provider.name);
    }

    // ── 2. Find or create a buyer (farmer) ───────────────────────────────
    let farmer = await User.findOne({ role: 'buyer' });
    if (!farmer) {
        farmer = await User.create({
            role: 'buyer',
            name: 'Farmer Test User',
            phone: '9900022200',
            address: 'Panipat, Haryana',
            status: 'approved'
        });
        console.log('Created farmer:', farmer.name);
    }

    // ── 3. Find or create a field executive ──────────────────────────────
    let feUser = await User.findOne({ role: 'field_executive' });
    if (!feUser) {
        feUser = await User.create({
            role: 'field_executive',
            name: 'FE Singh',
            phone: '9900033300',
            address: 'Rohtak, Haryana',
            status: 'approved'
        });
        console.log('Created field executive:', feUser.name);
    }

    // ── 4. Find or create machines ───────────────────────────────────────
    let machines = await Machine.find({ owner: provider._id });
    if (machines.length === 0) {
        await Machine.insertMany([
            { owner: provider._id, name: 'Mahindra 575 Tractor', priceDay: 2500, priceHour: 350, village: 'Karnal', distanceKm: 20 },
            { owner: provider._id, name: 'Harvester Combine', priceDay: 5000, priceHour: 700, village: 'Panipat', distanceKm: 30 },
            { owner: provider._id, name: 'Rotavator', priceDay: 1500, priceHour: 200, village: 'Karnal', distanceKm: 15 }
        ]);
        machines = await Machine.find({ owner: provider._id });
        console.log('Created', machines.length, 'machines');
    } else {
        console.log('Using', machines.length, 'existing machines');
    }

    // ── 5. Clean up old seed rentals ─────────────────────────────────────
    const oldCount = await Rental.countDocuments({ buyer: farmer._id, owner: provider._id });
    if (oldCount > 0) {
        await Rental.deleteMany({ buyer: farmer._id, owner: provider._id });
        console.log('Cleaned up', oldCount, 'old seed rentals');
    }

    // ── 6. Create sample bookings ─────────────────────────────────────────
    const now = new Date();
    const daysAgo = d => new Date(now - d * 86400000);
    // Build machine IDs list (guaranteed to have at least 1)
    const mid = machines.map(m => m._id);
    const getMachine = i => mid[i % mid.length];

    const bookingTemplates = [
        // Completed + cash collected
        { midIdx: 0, days: 3, status: 'Completed', cashCollected: true, cashCollectedBy: feUser._id, cashCollectedAt: daysAgo(2), cashNote: 'Collected at farm site' },
        // Completed + pending cash
        { midIdx: 1, days: 2, status: 'Completed', cashCollected: false },
        // In Progress + assigned FE
        { midIdx: 2, days: 1, status: 'In Progress', assignedFieldExec: feUser._id },
        // Accepted
        { midIdx: 0, days: 5, status: 'Accepted' },
        // New (pending)
        { midIdx: 1, days: 4, status: 'New' },
        // Cancelled
        { midIdx: 2, days: 2, status: 'Cancelled', cancelReason: 'Farmer cancelled due to rain' }
    ];

    const rentalsToCreate = bookingTemplates.map((t, i) => {
        const from = daysAgo(14 - i * 2);
        const to = new Date(from.getTime() + t.days * 86400000);
        const machineId = getMachine(t.midIdx);
        const machine = machines.find(m => m._id.equals(machineId)) || machines[0];
        const priceDay = machine?.priceDay || 2000;
        const totalAmount = t.days * priceDay;
        const commission = t.status === 'Completed' ? Math.round(totalAmount * COMMISSION_RATE) : 0;

        return {
            machine: machine._id,
            owner: provider._id,
            buyer: farmer._id,
            fromDate: from,
            toDate: to,
            totalAmount,
            platformCommission: commission,
            ownerPayout: totalAmount - commission,
            status: t.status,
            cancelReason: t.cancelReason || undefined,
            assignedFieldExec: t.assignedFieldExec || null,
            cashCollected: t.cashCollected || false,
            cashCollectedAt: t.cashCollectedAt || null,
            cashCollectedBy: t.cashCollectedBy || null,
            cashNote: t.cashNote || ''
        };
    });

    await Rental.insertMany(rentalsToCreate);
    console.log('Created', rentalsToCreate.length, 'sample rental bookings');

    // ── 7. Summary ────────────────────────────────────────────────────────
    const counts = {};
    for (const r of rentalsToCreate) counts[r.status] = (counts[r.status] || 0) + 1;
    console.log('Breakdown:', counts);
    console.log('\nSeeding done! ✅');
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
