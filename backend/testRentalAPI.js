/**
 * testRentalAPI.js
 * Tests all Equipment Rental admin API endpoints end-to-end.
 * Usage: node testRentalAPI.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Rental = require('./models/Rental');

const BASE = 'http://192.168.31.124:5500/api/employee';

async function getAdminToken() {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('No admin user found in DB');
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    await mongoose.disconnect();
    return token;
}

async function req(method, path, token, body) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function run() {
    console.log('\n==== Equipment Rental Admin API Test ====\n');

    const token = await getAdminToken();
    console.log('✅ Admin token generated\n');

    let firstBookingId = null;
    let feId = null;

    // ── 1. Stats ─────────────────────────────────────────────────────────
    {
        const r = await req('GET', '/admin/rental/stats', token);
        if (r.ok) {
            console.log('✅ GET /admin/rental/stats');
            console.log('   Total Bookings:', r.data.totalBookings);
            console.log('   Active:', r.data.activeBookings, '| Completed:', r.data.completedBookings, '| Cancelled:', r.data.cancelledBookings);
            console.log('   Cash Collected:', r.data.cashCollected, '| Cash Pending:', r.data.cashPending);
            console.log('   Total Machines:', r.data.totalMachines, '| Providers:', r.data.totalProviders);
        } else {
            console.log('❌ GET /admin/rental/stats -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 2. Bookings List ──────────────────────────────────────────────────
    {
        const r = await req('GET', '/admin/rental/bookings', token);
        if (r.ok) {
            console.log('\n✅ GET /admin/rental/bookings');
            console.log('   Total returned:', r.data.bookings?.length, '| DB total:', r.data.total);
            if (r.data.bookings?.length > 0) {
                firstBookingId = r.data.bookings[0]._id;
                const b = r.data.bookings[0];
                console.log(`   First: [${b.bookingId}] Machine="${b.machine.name}" Status="${b.status}" Amount=₹${b.totalAmount}`);
            }
        } else {
            console.log('❌ GET /admin/rental/bookings -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 3. Bookings Filter by Status ──────────────────────────────────────
    {
        const r = await req('GET', '/admin/rental/bookings?status=Completed', token);
        if (r.ok) {
            console.log('\n✅ GET /admin/rental/bookings?status=Completed');
            console.log('   Completed bookings returned:', r.data.bookings?.length);
        } else {
            console.log('❌ GET /admin/rental/bookings?status=Completed -', r.status);
        }
    }

    // ── 4. Field Executives List ─────────────────────────────────────────
    {
        const r = await req('GET', '/admin/rental/field-execs', token);
        if (r.ok) {
            console.log('\n✅ GET /admin/rental/field-execs');
            console.log('   Field Execs found:', r.data.length);
            if (r.data.length > 0) feId = r.data[0]._id;
        } else {
            console.log('❌ GET /admin/rental/field-execs -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 5. Update Status ──────────────────────────────────────────────────
    if (firstBookingId) {
        const r = await req('PUT', `/admin/rental/bookings/${firstBookingId}/status`, token, { status: 'In Progress' });
        if (r.ok) {
            console.log('\n✅ PUT /admin/rental/bookings/:id/status');
            console.log('   Updated to: In Progress');
        } else {
            console.log('❌ PUT /admin/rental/bookings/:id/status -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 6. Assign Field Executive ─────────────────────────────────────────
    if (firstBookingId && feId) {
        const r = await req('PUT', `/admin/rental/bookings/${firstBookingId}/assign`, token, { fieldExecId: feId });
        if (r.ok) {
            console.log('\n✅ PUT /admin/rental/bookings/:id/assign');
            console.log('  ', r.data.message);
        } else {
            console.log('❌ PUT /admin/rental/bookings/:id/assign -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 7. Mark Cash Collected ────────────────────────────────────────────
    if (firstBookingId) {
        const r = await req('PUT', `/admin/rental/bookings/${firstBookingId}/collect`, token, { cashNote: 'Test collection note' });
        if (r.ok) {
            console.log('\n✅ PUT /admin/rental/bookings/:id/collect');
            console.log('  ', r.data.message);
        } else {
            console.log('❌ PUT /admin/rental/bookings/:id/collect -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 8. Cash Collections Report ────────────────────────────────────────
    {
        const r = await req('GET', '/admin/rental/cash-collections', token);
        if (r.ok) {
            console.log('\n✅ GET /admin/rental/cash-collections');
            console.log('   Collections found:', r.data.length);
            if (r.data.length > 0) console.log('   First:', r.data[0].bookingId, '| Amount: ₹' + r.data[0].totalAmount);
        } else {
            console.log('❌ GET /admin/rental/cash-collections -', r.status, JSON.stringify(r.data));
        }
    }

    // ── 9. CSV Export (check headers) ─────────────────────────────────────
    {
        const res = await fetch(`${BASE}/admin/rental/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const text = await res.text();
            const lines = text.trim().split('\n');
            console.log('\n✅ GET /admin/rental/export (CSV)');
            console.log('   Header row:', lines[0].substring(0, 60) + '...');
            console.log('   Data rows:', lines.length - 1);
        } else {
            console.log('❌ GET /admin/rental/export -', res.status);
        }
    }

    console.log('\n==== All tests completed ====\n');
    process.exit(0);
}

run().catch(err => { console.error('Test error:', err); process.exit(1); });
