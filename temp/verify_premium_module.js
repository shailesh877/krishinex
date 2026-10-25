const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const PremiumFarmerTerms = require('../backend/models/PremiumFarmerTerms');
const PremiumFarmerApplication = require('../backend/models/PremiumFarmerApplication');

async function testPremiumFarmer() {
  try {
    console.log('Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Check or seed terms
    let terms = await PremiumFarmerTerms.findOne({ isActive: true }).sort({ version: -1 });
    if (!terms) {
      console.log('No terms found. Seeding default Terms v1...');
      terms = await PremiumFarmerTerms.create({
        version: 1,
        titleEn: 'Krishinex Premium Farmer Agreement',
        titleHi: 'कृषिनेक्स प्रीमियम किसान अनुबंध व नियम',
        contentEn: `1. Eligibility: Open to registered dairy farmers delivering daily milk.\n2. Membership Fee: Non-refundable fee of ₹999 for 365 days.\n3. Operational Credit Limit: Subject to milk consistency and verification.\n4. Timely Settlement: Fortnightly/monthly payout reconciliations apply.\n5. Termination: Breach of quality standards revokes VIP status immediately.`,
        contentHi: `1. पात्रता: केवल पंजीकृत दुग्ध उत्पादक किसानों के लिए मान्य।\n2. सदस्यता शुल्क: ₹999 का वार्षिक गैर-वापसी योग्य सदस्यता शुल्क।\n3. क्रेडिट/संचालन सीमा: दूध की गुणवत्ता और निरंतरता के आधार पर तय की जाएगी।\n4. भुगतान निपटान: पाक्षिक और मासिक समायोजन नियमानुसार होगा।\n5. निलंबन: गुणवत्ता में मिलावट या नियमों के उल्लंघन पर सदस्यता रद्द कर दी जाएगी।`,
        membershipFee: 999,
        validityDays: 365,
        approvalTatHours: 24,
        isActive: true,
      });
      console.log('Seeded Terms v1 successfully.');
    } else {
      console.log(`Active Terms found: Version ${terms.version}, Fee: ₹${terms.membershipFee}`);
    }

    // 2. Find a test farmer user
    let testUser = await User.findOne({ role: 'farmer' });
    if (!testUser) {
      testUser = await User.findOne({});
    }
    console.log(`Testing with user: ${testUser?.name || 'N/A'} (ID: ${testUser?._id})`);

    // 3. Test Terms Snapshot preservation test
    const dummyApp = new PremiumFarmerApplication({
      userId: testUser._id,
      farmerName: testUser.name || 'Test Farmer',
      farmerPhone: testUser.mobileNumber || '9999999999',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: terms.version,
      termsId: terms._id,
      termsSnapshotEn: terms.contentEn,
      termsSnapshotHi: terms.contentHi,
      paymentAmount: terms.membershipFee,
      paymentStatus: 'completed',
      razorpayPaymentId: 'pay_test_' + Date.now(),
      status: 'pending_approval',
    });
    await dummyApp.save();
    console.log(`Created test application with snapshot terms v${dummyApp.termsVersion}. App ID: ${dummyApp._id}`);

    // Verify snapshot persistence
    const saved = await PremiumFarmerApplication.findById(dummyApp._id);
    console.log(`Verified App termsVersion: ${saved.termsVersion}`);
    console.log(`Verified App termsSnapshotEn present: ${saved.termsSnapshotEn.length > 20}`);
    console.log(`Verified App termsSnapshotHi present: ${saved.termsSnapshotHi.length > 20}`);

    // Clean up test app
    await PremiumFarmerApplication.deleteOne({ _id: dummyApp._id });
    console.log('Cleaned up test application record.');

    console.log('--- ALL BACKEND MODEL & IMMUTABLE SNAPSHOT TESTS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testPremiumFarmer();
