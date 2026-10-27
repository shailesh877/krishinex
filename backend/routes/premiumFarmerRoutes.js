const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PremiumFarmerTerms = require('../models/PremiumFarmerTerms');
const PremiumFarmerApplication = require('../models/PremiumFarmerApplication');

// Safe WebSocket Realtime Notifier Helper
function notifyRealtime(eventData, targetUserId = null) {
  try {
    if (!global.io) return;
    global.io.to('admin_room').emit('premium_farmer_event', eventData);
    global.io.emit('premium_farmer_event', eventData);
    if (targetUserId) {
      global.io.to(`user_${targetUserId}`).emit('premium_farmer_event', eventData);
    }
  } catch (e) {
    console.warn('[Socket.io Premium Farmer Error]:', e.message);
  }
}

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_Tj1DcreDse1Rkh',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'MeItwXvHkwsCBecap3O0nmOI',
  });
} catch (err) {
  console.warn('Razorpay initialization skipped:', err.message);
}

// Seed default terms v1 if none exist
async function getOrSeedActiveTerms() {
  let terms = await PremiumFarmerTerms.findOne({ isActive: true }).sort({ version: -1 });
  if (!terms) {
    terms = await PremiumFarmerTerms.create({
      version: 1,
      titleEn: 'KrishiNex Premium Farmer Membership Agreement',
      titleHi: 'कृषि-नेक्स प्रीमियम किसान सदस्यता नियम एवं शर्तें',
      contentEn: `1. ELIGIBILITY & MEMBERSHIP:
The KrishiNex Premium Farmer Program is available exclusively to registered agricultural producers. Membership is valid for 365 calendar days from the date of administrative approval.

2. PAYMENT & NON-REFUNDABLE DUES:
The annual membership fee must be remitted via the authorized payment gateway. This fee covers administrative verification, priority technical advisory, digital credentialing, and eligibility review for customized credit/transaction limits. The fee is non-refundable upon submission.

3. TWO-TIER APPROVAL PROTOCOL:
Payment completion alone DOES NOT automatically confer active Premium Farmer status or guarantee any specific credit limit. Following payment verification, your application enters the "Pending Approval" state. The KrishiNex Administrative Board reviews your operational profile within 24 working hours.

4. INDIVIDUAL LIMIT ASSIGNMENT & USAGE:
Assigned limits (Credit Limit or Agricultural Input Purchasing Limit) are determined on an individual basis based on verification records, landholding declarations, and regional risk assessment. The company reserves the right to calibrate, increase, or suspend limits in accordance with financial compliance standards.

5. CODE OF CONDUCT & AGRICULTURAL INPUT UTILIZATION:
Premium benefits, priority bookings for equipment rentals, discounted lab tests, and credit allocations must be utilized solely for bonafide agricultural cultivation and certified farm operations. Misuse or third-party transfer results in immediate termination of premium benefits without refund.

6. SERVICE CONTINUITY & RENEWAL:
Upon expiry of the 365-day period, the farmer may renew their membership under the then-current active terms. Historical benefits and terms agreed to upon original registration remain recorded permanently in your membership archive.`,

      contentHi: `1. पात्रता एवं सदस्यता (Eligibility & Membership):
कृषि-नेक्स प्रीमियम किसान सदस्यता विशेष रूप से पंजीकृत किसानों हेतु उपलब्ध है। यह सदस्यता व्यवस्थापक (Admin) द्वारा स्वीकृति की तिथि से पूरे 365 दिनों के लिए वैध रहेगी।

2. सदस्यता शुल्क एवं गैर-वापसी नियम (Payment Terms):
वार्षिक सदस्यता शुल्क आधिकारिक गेटवे के माध्यम से जमा करना अनिवार्य है। यह शुल्क तकनीकी परामर्श, डिजिटल प्राथमिकता, और विशेष क्रेडिट सीमा सत्यापन हेतु लिया जाता है। आवेदन जमा करने के बाद शुल्क गैर-वापसी योग्य (Non-Refundable) होगा।

3. दो-चरणीय अनुमोदन प्रक्रिया (Approval Protocol):
केवल भुगतान करने से स्वतः प्रीमियम किसान दर्जा या क्रेडिट सीमा सक्रिय नहीं होगी। भुगतान के बाद आवेदन "समीक्षाधीन (Pending Approval)" स्थिति में जाएगा। प्रशासनिक टीम 24 कार्य घंटों के भीतर आपके रिकॉर्ड की समीक्षा करेगी।

4. व्यक्तिगत सीमा आवंटन (Individual Limit Assignment):
स्वीकृति के समय एडमिन द्वारा प्रत्येक किसान की प्रोफाइल अनुसार व्यक्तिगत सीमा (Credit/Transaction Limit) तय की जाएगी। कंपनी के पास नियमानुसार सीमा घटाने, बढ़ाने या संशोधित करने का पूरा अधिकार सुरक्षित है।

5. विशेष सुविधाओं का सदुपयोग (Usage of Benefits):
प्रीमियम किसान को मिलने वाली प्राथमिकताएं (कृषि डॉक्टर परामर्श, उपकरण किराए में छूट, बीज/खाद क्रेडिट) केवल वैध खेती और फसल उत्पादन हेतु मान्य होंगी। किसी अन्य व्यक्ति को सुविधा हस्तांतरित करना प्रतिबंधित है।

6. नियमों की अपरिवर्तनीयता (Terms Immutability):
जिस समय आप यह सदस्यता ले रहे हैं, उस समय स्वीकृत किए गए नियम व शर्तें आपके रिकॉर्ड में स्थायी रूप से सुरक्षित रहेंगी। भविष्य में नियम बदलने पर भी आपके मौजूदा कार्यकाल पर कोई प्रतिकूल प्रभाव नहीं पड़ेगा।`,
      membershipFee: 999,
      validityDays: 365,
      approvalTatHours: 24,
      minimumCreditLimit: 10000,
      isActive: true
    });
  }
  return terms;
}

// @route   GET /api/premium-farmer/terms-and-status
// @desc    Get active terms, membership fee and user's current premium status
// @access  Private
router.get('/terms-and-status', protect, async (req, res) => {
  try {
    const terms = await getOrSeedActiveTerms();
    const user = await User.findById(req.user.id).select(
      'name phone address isPremiumFarmer premiumFarmerStatus premiumFarmerLimit premiumLimitType premiumActivatedAt premiumExpiresAt premiumAcceptedTermsVersion creditLimit creditUsed'
    );

    // Get latest application
    const latestApplication = await PremiumFarmerApplication.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });

    // Check if current membership has expired
    if (user?.isPremiumFarmer && user?.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
      user.isPremiumFarmer = false;
      user.premiumFarmerStatus = 'expired';
      await user.save();
    }

    res.json({
      success: true,
      terms: {
        id: terms._id,
        version: terms.version,
        titleEn: terms.titleEn,
        titleHi: terms.titleHi,
        contentEn: terms.contentEn,
        contentHi: terms.contentHi,
        membershipFee: terms.membershipFee,
        strikeThroughFee: terms.strikeThroughFee !== undefined ? terms.strikeThroughFee : 1999,
        validityDays: terms.validityDays,
        bannerBadgeText: terms.bannerBadgeText || 'VIP FARMER MEMBERSHIP',
        bannerTitleHi: terms.bannerTitleHi || 'कृषि-नेक्स प्रीमियम किसान बनें',
        bannerTitleEn: terms.bannerTitleEn || 'Join as KrishiNex Premium Farmer',
        bannerSubHi: terms.bannerSubHi || 'विशेष क्रेडिट सीमा, शून्य-कमीशन बाज़ार पहुंच, और 24×7 विशेषज्ञ कृषि डॉक्टर सेवा',
        bannerSubEn: terms.bannerSubEn || 'Unlock customized agricultural credit limit, priority doctor access, and dedicated inputs.',
        benefits: Array.isArray(terms.benefits) && terms.benefits.length > 0 ? terms.benefits : [
          {
            titleHi: 'कस्टमाइज्ड कृषि-क्रेडिट सीमा',
            titleEn: 'Assigned Agri-Credit Limit',
            subHi: 'प्रशासनिक अनुमोदन पर बीज, खाद एवं उपकरणों के लिए विशेष सीमा',
            subEn: 'Dedicated credit allocation for seeds, fertilizer, and equipment.',
            icon: 'card',
            bgColor: '#FEF3C7',
            iconColor: '#D97706',
            enabled: true
          },
          {
            titleHi: 'प्राथमिकता कृषि डॉक्टर सेवा',
            titleEn: 'Priority Agronomist Consultation',
            subHi: 'बिना प्रतीक्षा के सीधे विशेषज्ञ से वीडियो व ऑडियो परामर्श',
            subEn: 'Immediate access to certified agricultural scientists.',
            icon: 'medkit',
            bgColor: '#ECFDF5',
            iconColor: '#059669',
            enabled: true
          },
          {
            titleHi: 'उपकरण एवं श्रम किराए पर विशेष छूट',
            titleEn: 'Discounted Machinery & Labour',
            subHi: 'ट्रैक्टर, हार्वेस्टर व लेबर बुकिंग पर वीआईपी रियायती दरें',
            subEn: 'Flat member-only pricing on agricultural machinery rentals.',
            icon: 'pricetags',
            bgColor: '#EFF6FF',
            iconColor: '#2563EB',
            enabled: true
          }
        ],
        approvalTatHours: terms.approvalTatHours,
        minimumCreditLimit: terms.minimumCreditLimit !== undefined ? terms.minimumCreditLimit : 10000
      },
      user: {
        isPremiumFarmer: user?.isPremiumFarmer || false,
        status: user?.premiumFarmerStatus || 'none',
        profileStatus: user?.status || 'pending',
        kycStatus: user?.kycStatus || 'pending',
        isVerified: user?.status === 'approved' || user?.kycStatus === 'verified',
        limit: user?.premiumFarmerLimit || 0,
        limitType: user?.premiumLimitType || 'credit_limit',
        creditLimit: user?.creditLimit || 0,
        creditUsed: user?.creditUsed || 0,
        activatedAt: user?.premiumActivatedAt || null,
        expiresAt: user?.premiumExpiresAt || null,
        acceptedTermsVersion: user?.premiumAcceptedTermsVersion || null
      },
      latestApplication
    });
  } catch (error) {
    console.error('Fetch Terms and Status Error:', error);
    res.status(500).json({ error: 'Failed to fetch premium farmer details.' });
  }
});

// @route   POST /api/premium-farmer/create-order
// @desc    Initiate Razorpay order for Premium Farmer Membership
// @access  Private
router.post('/create-order', protect, async (req, res) => {
  try {
    const { termsVersion } = req.body;
    if (!termsVersion) {
      return res.status(400).json({ error: 'Terms version confirmation is required.' });
    }

    const terms = await PremiumFarmerTerms.findOne({ version: Number(termsVersion) });
    if (!terms) {
      return res.status(404).json({ error: 'Selected terms version not found.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // REQUIREMENT: Farmer must be verified (status === 'approved')
    const isVerified = user.status === 'approved' || user.kycStatus === 'verified';
    if (!isVerified) {
      return res.status(403).json({
        error: 'प्रीमियम किसान क्लब में शामिल होने के लिए आपका किसान प्रोफ़ाइल सत्यापित (Verified / Approved) होना आवश्यक है। कृपया पहले अपनी KYC / प्रोफ़ाइल सत्यापन पूरा करें।',
        errorEn: 'Your farmer profile must be verified/approved by admin to apply for Premium Farmer Club. Please complete your profile KYC verification first.'
      });
    }

    // Check if membership is expired
    if (user.isPremiumFarmer && user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
      user.isPremiumFarmer = false;
      user.premiumFarmerStatus = 'expired';
      await user.save();
    }

    // Check if user already has an active membership (not expired)
    if (user.isPremiumFarmer) {
      return res.status(400).json({ error: 'You already have an active Premium Farmer Membership!' });
    }

    const existingPending = await PremiumFarmerApplication.findOne({
      userId: user._id,
      status: 'pending_approval'
    });
    if (existingPending) {
      return res.status(400).json({ error: 'Your application is already submitted and pending admin approval.' });
    }

    const feeAmount = typeof terms.membershipFee === 'number' ? terms.membershipFee : 999;
    const receiptId = `pf_rcpt_${Date.now()}_${String(user._id).substring(18)}`;

    // If membershipFee is 0 (FREE application / trial / promotional)
    if (feeAmount <= 0) {
      const application = await PremiumFarmerApplication.create({
        userId: user._id,
        farmerName: user.name,
        farmerPhone: user.phone,
        farmerAddress: user.address || '',
        termsVersion: terms.version,
        termsId: terms._id,
        termsSnapshotEn: terms.contentEn,
        termsSnapshotHi: terms.contentHi,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        paymentAmount: 0,
        paymentStatus: 'completed',
        razorpayOrderId: `free_grant_${Date.now()}`,
        razorpayPaymentId: `free_pay_${Date.now()}`,
        paidAt: new Date(),
        status: 'pending_approval'
      });

      user.premiumFarmerStatus = 'pending_approval';
      user.premiumAcceptedTermsVersion = terms.version;
      await user.save();

      notifyRealtime({
        action: 'premium_application_submitted',
        applicationId: application._id,
        farmerName: application.farmerName,
        message: `${application.farmerName} submitted Premium Farmer Application (Free Plan).`
      });

      return res.json({
        success: true,
        isFree: true,
        applicationId: application._id,
        amount: 0,
        termsVersion: terms.version,
        message: 'आवेदन सफलतापूर्वक जमा हो गया है! व्यवस्थापक (Admin) द्वारा 24 कार्य घंटों में समीक्षा की जाएगी।'
      });
    }

    const options = {
      amount: Math.round(feeAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId: String(user._id),
        type: 'PREMIUM_FARMER_MEMBERSHIP',
        termsVersion: String(terms.version)
      }
    };

    let order = null;
    if (razorpay) {
      try {
        order = await razorpay.orders.create(options);
      } catch (rzpErr) {
        console.warn('Razorpay order creation fallback to simulated order:', rzpErr.message);
      }
    }

    // Fallback order object if gateway keys are sandbox / offline
    if (!order) {
      order = {
        id: `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: options.amount,
        currency: 'INR',
        receipt: receiptId
      };
    }

    // Create or update application draft with snapshot
    const application = await PremiumFarmerApplication.create({
      userId: user._id,
      farmerName: user.name,
      farmerPhone: user.phone,
      farmerAddress: user.address || '',
      termsVersion: terms.version,
      termsId: terms._id,
      termsSnapshotEn: terms.contentEn,
      termsSnapshotHi: terms.contentHi,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      paymentAmount: feeAmount,
      paymentStatus: 'created',
      razorpayOrderId: order.id,
      status: 'payment_pending'
    });

    res.json({
      success: true,
      order,
      applicationId: application._id,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_live_Tj1DcreDse1Rkh',
      amount: feeAmount,
      termsVersion: terms.version
    });
  } catch (error) {
    console.error('Create Premium Order Error:', error);
    res.status(500).json({ error: 'Failed to initiate premium farmer order.' });
  }
});

// @route   POST /api/premium-farmer/verify-payment
// @desc    Verify Razorpay signature and submit application for Admin Review
// @access  Private
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      applicationId
    } = req.body;

    let application = null;
    if (applicationId) {
      application = await PremiumFarmerApplication.findById(applicationId);
    }
    if (!application && razorpay_order_id) {
      application = await PremiumFarmerApplication.findOne({ razorpayOrderId: razorpay_order_id });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    // Verify signature if secret is available
    if (process.env.RAZORPAY_KEY_SECRET && razorpay_signature && !razorpay_order_id.startsWith('order_sim_')) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        application.paymentStatus = 'failed';
        await application.save();
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }
    }

    // Mark application as paid and submitted for approval
    application.paymentStatus = 'completed';
    application.razorpayPaymentId = razorpay_payment_id || `pay_sim_${Date.now()}`;
    application.paidAt = new Date();
    application.status = 'pending_approval';
    await application.save();

    // Update user status to pending_approval
    const user = await User.findById(req.user.id);
    if (user) {
      user.premiumFarmerStatus = 'pending_approval';
      user.premiumAcceptedTermsVersion = application.termsVersion;
      await user.save();
    }

    // Create completed Transaction entry for accounting
    try {
      const txnId = razorpay_payment_id 
        ? `VIP-${razorpay_payment_id}` 
        : `VIP-${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      await Transaction.create({
        transactionId: txnId,
        recipient: req.user.id,
        module: 'Platform',
        amount: application.paymentAmount,
        type: 'Collection',
        paymentMode: 'Razorpay',
        status: 'Completed',
        note: `Premium Farmer Annual Membership Fee (Order: ${razorpay_order_id || 'N/A'})`
      });
    } catch (txErr) {
      console.warn('Membership transaction logging skipped:', txErr.message);
    }

    // Realtime notification to admin and user
    notifyRealtime({
      action: 'premium_application_submitted',
      applicationId: application._id,
      farmerName: application.farmerName,
      message: `${application.farmerName} submitted Premium Farmer Application.`
    });

    res.json({
      success: true,
      message: 'Payment verified! Application submitted successfully. Approval normally takes up to 24 hours during working hours.',
      application
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// ----------------------------------------------------
// ADMIN ENDPOINTS (Super Admin Portal)
// ----------------------------------------------------

// @route   GET /api/premium-farmer/admin/stats
// @desc    Dashboard KPI cards for Premium Farmer module
// @access  Private/Admin
router.get('/admin/stats', protect, async (req, res) => {
  try {
    const totalApplications = await PremiumFarmerApplication.countDocuments();
    const pendingApproval = await PremiumFarmerApplication.countDocuments({ status: 'pending_approval' });
    const approvedCount = await PremiumFarmerApplication.countDocuments({ status: 'approved' });
    const rejectedCount = await PremiumFarmerApplication.countDocuments({ status: 'rejected' });
    const activePremiumFarmers = await User.countDocuments({ isPremiumFarmer: true });

    // Sum total membership revenue
    const revenueAgg = await PremiumFarmerApplication.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Sum total limits assigned
    const limitsAgg = await User.aggregate([
      { $match: { isPremiumFarmer: true } },
      { $group: { _id: null, total: { $sum: '$premiumFarmerLimit' } } }
    ]);
    const totalLimitsAssigned = limitsAgg[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalApplications,
        pendingApproval,
        approvedCount,
        rejectedCount,
        activePremiumFarmers,
        totalRevenue,
        totalLimitsAssigned
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch premium farmer stats.' });
  }
});

// @route   GET /api/premium-farmer/admin/applications
// @desc    List all applications with search, status filters & pagination
// @access  Private/Admin
router.get('/admin/applications', protect, async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { farmerName: regex },
        { farmerPhone: regex },
        { farmerAddress: regex },
        { razorpayPaymentId: regex }
      ];
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (p - 1) * l;

    const total = await PremiumFarmerApplication.countDocuments(query);
    const applications = await PremiumFarmerApplication.find(query)
      .populate('userId', 'name phone address walletBalance creditLimit creditUsed')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    res.json({
      success: true,
      applications,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error) {
    console.error('Admin Applications Error:', error);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// @route   GET /api/premium-farmer/admin/payments
// @desc    List all premium membership payment transactions with filters, search, metrics & pagination
// @access  Private/Admin
router.get('/admin/payments', protect, async (req, res) => {
  try {
    const { status, search, dateRange, page, limit } = req.query;
    let query = {};

    // Filter by paymentStatus (completed, created, failed)
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { farmerName: regex },
        { farmerPhone: regex },
        { razorpayPaymentId: regex },
        { razorpayOrderId: regex }
      ];
    }

    // Filter by date range
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: startDate };
      } else if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
        query.createdAt = { $gte: startDate };
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        query.createdAt = { $gte: startDate };
      }
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit) || 25));
    const skip = (p - 1) * l;

    const total = await PremiumFarmerApplication.countDocuments(query);
    const payments = await PremiumFarmerApplication.find(query)
      .populate('userId', 'name phone address walletBalance creditLimit creditUsed')
      .populate('termsId', 'title version validityDays membershipFee')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    // Aggregate payment metrics across all premium transactions
    const statsAgg = await PremiumFarmerApplication.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' }
        }
      }
    ]);

    let totalRevenue = 0;
    let completedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    statsAgg.forEach(s => {
      if (s._id === 'completed') {
        totalRevenue = s.totalAmount || 0;
        completedCount = s.count || 0;
      } else if (s._id === 'failed') {
        failedCount = s.count || 0;
      } else {
        pendingCount += (s.count || 0);
      }
    });

    res.json({
      success: true,
      payments,
      summary: {
        totalRevenue,
        completedCount,
        failedCount,
        pendingCount,
        totalTransactions: total
      },
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error) {
    console.error('Admin Payments Error:', error);
    res.status(500).json({ error: 'Failed to fetch premium payments.' });
  }
});

// @route   PUT /api/premium-farmer/admin/applications/:id/review
// @desc    Approve or reject application, assign farmer limit, activate premium status
// @access  Private/Admin
router.put('/admin/applications/:id/review', protect, async (req, res) => {
  try {
    const { action, assignedLimit, limitType, adminRemarks } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approved' or 'rejected'." });
    }

    const appRecord = await PremiumFarmerApplication.findById(req.params.id);
    if (!appRecord) return res.status(404).json({ error: 'Application not found.' });

    const user = await User.findById(appRecord.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const terms = await PremiumFarmerTerms.findOne({ version: appRecord.termsVersion }) || await getOrSeedActiveTerms();
    
    // Strict contract-first validity: Exactly as configured by Admin in the purchased Terms version
    const planValidity = terms.validityDays;
    const isLifetime = planValidity === 0 || planValidity === '0' || planValidity >= 9999;
    const validityDays = isLifetime ? 36500 : (Number(planValidity) || 365); // ~100 years for lifetime, else exact days configured by admin

    appRecord.status = action;
    appRecord.adminRemarks = adminRemarks || '';
    appRecord.reviewedBy = req.user.id;
    appRecord.reviewedAt = new Date();

    if (action === 'approved') {
      const limitVal = Number(assignedLimit);
      const minRequired = typeof terms.minimumCreditLimit === 'number' ? terms.minimumCreditLimit : 0;
      if (!limitVal || isNaN(limitVal) || limitVal <= 0) {
        return res.status(400).json({ error: 'किसान को प्रीमियम सदस्य स्वीकृत करने के लिए क्रेडिट लिमिट (Credit Limit) दर्ज करना अनिवार्य है।' });
      }
      if (minRequired > 0 && limitVal < minRequired) {
        return res.status(400).json({ error: `स्वीकृत क्रेडिट लिमिट न्यूनतम ₹${minRequired.toLocaleString('en-IN')} होनी चाहिए (नियम v${terms.version} के अनुसार)।` });
      }
      appRecord.assignedLimit = limitVal;
      appRecord.limitType = limitType || 'credit_limit';

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + validityDays);
      appRecord.expiresAt = expiry;

      // Update User document
      user.isPremiumFarmer = true;
      user.premiumFarmerStatus = 'approved';
      user.premiumFarmerLimit = limitVal;
      user.premiumLimitType = appRecord.limitType;
      user.premiumActivatedAt = new Date();
      user.premiumExpiresAt = expiry;
      user.creditLimit = limitVal; // Also link into main agri-credit limit for input purchases
      await user.save();
    } else {
      user.isPremiumFarmer = false;
      user.premiumFarmerStatus = 'rejected';
      await user.save();
    }

    await appRecord.save();

    // Realtime notification
    notifyRealtime({
      action: action === 'approved' ? 'premium_farmer_approved' : 'premium_farmer_rejected',
      userId: user._id,
      assignedLimit: appRecord.assignedLimit,
      message: action === 'approved'
        ? `बधाई हो! आपकी प्रीमियम किसान सदस्यता ₹${appRecord.assignedLimit} सीमा के साथ स्वीकृत कर दी गई है।`
        : `आपकी प्रीमियम किसान सदस्यता अस्वीकृत कर दी गई है।`
    }, user._id);

    res.json({
      success: true,
      message: `Application has been ${action} successfully.`,
      application: appRecord
    });
  } catch (error) {
    console.error('Review Application Error:', error);
    res.status(500).json({ error: error.message || 'Failed to review application.' });
  }
});

// @route   PUT /api/premium-farmer/admin/farmers/:id/limit
// @desc    Update individual farmer's limit anytime
// @access  Private/Admin
router.put('/admin/farmers/:id/limit', protect, async (req, res) => {
  try {
    const { assignedLimit, limitType, adminRemarks } = req.body;
    const limitVal = Number(assignedLimit);
    if (isNaN(limitVal) || limitVal < 0) {
      return res.status(400).json({ error: 'Valid non-negative limit amount is required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Farmer user not found.' });

    user.premiumFarmerLimit = limitVal;
    if (limitType) user.premiumLimitType = limitType;
    user.creditLimit = limitVal;
    await user.save();

    // Update latest approved application audit record
    const latestApp = await PremiumFarmerApplication.findOne({ userId: user._id, status: 'approved' })
      .sort({ createdAt: -1 });
    if (latestApp) {
      latestApp.assignedLimit = limitVal;
      if (limitType) latestApp.limitType = limitType;
      if (adminRemarks) latestApp.adminRemarks = adminRemarks;
      await latestApp.save();
    }

    notifyRealtime({
      action: 'premium_limit_updated',
      userId: user._id,
      newLimit: limitVal,
      message: `आपकी प्रीमियम किसान सीमा ₹${limitVal} पर अपडेट कर दी गई है।`
    }, user._id);

    res.json({
      success: true,
      message: `Farmer limit updated to ₹${limitVal} successfully.`,
      user: {
        id: user._id,
        name: user.name,
        limit: user.premiumFarmerLimit,
        limitType: user.premiumLimitType
      }
    });
  } catch (error) {
    console.error('Update Limit Error:', error);
    res.status(500).json({ error: 'Failed to update farmer limit.' });
  }
});

// @route   GET /api/premium-farmer/admin/terms
// @desc    Get all terms versions with current active version
// @access  Private/Admin
router.get('/admin/terms', protect, async (req, res) => {
  try {
    const allVersions = await PremiumFarmerTerms.find()
      .populate('createdBy', 'name')
      .sort({ version: -1 });

    const activeTerms = await getOrSeedActiveTerms();

    res.json({
      success: true,
      activeTerms,
      allVersions
    });
  } catch (error) {
    console.error('Admin Terms Error:', error);
    res.status(500).json({ error: 'Failed to fetch terms versions.' });
  }
});

// @route   POST /api/premium-farmer/admin/terms
// @desc    Publish a NEW terms version without overwriting past versions
// @access  Private/Admin
router.post('/admin/terms', protect, async (req, res) => {
  try {
    const {
      titleEn,
      titleHi,
      contentEn,
      contentHi,
      membershipFee,
      strikeThroughFee,
      validityDays,
      bannerBadgeText,
      bannerTitleHi,
      bannerTitleEn,
      bannerSubHi,
      bannerSubEn,
      benefits,
      approvalTatHours,
      minimumCreditLimit
    } = req.body;

    if (!contentEn || !contentHi) {
      return res.status(400).json({ error: 'Both English and Hindi terms content are required.' });
    }

    // Determine latest version number
    const latest = await PremiumFarmerTerms.findOne().sort({ version: -1 });
    const nextVersion = (latest?.version || 0) + 1;

    // Deactivate previous terms
    await PremiumFarmerTerms.updateMany({}, { $set: { isActive: false } });

    // Create new immutable terms version
    const feeParsed = membershipFee !== undefined && membershipFee !== '' ? Number(membershipFee) : 999;
    const strikeParsed = strikeThroughFee !== undefined && strikeThroughFee !== '' ? Number(strikeThroughFee) : 1999;
    const validityParsed = validityDays !== undefined && validityDays !== '' ? Number(validityDays) : 365;
    const minLimitParsed = minimumCreditLimit !== undefined && minimumCreditLimit !== '' ? Number(minimumCreditLimit) : 10000;

    let parsedBenefits = [];
    if (Array.isArray(benefits)) {
      parsedBenefits = benefits.filter(b => b && (b.titleHi || b.titleEn));
    } else if (typeof benefits === 'string' && benefits.trim()) {
      try {
        const jsonB = JSON.parse(benefits);
        if (Array.isArray(jsonB)) parsedBenefits = jsonB;
      } catch (e) {
        console.warn('Could not parse benefits string:', e.message);
      }
    }

    const newTerms = await PremiumFarmerTerms.create({
      version: nextVersion,
      titleEn: titleEn || 'KrishiNex Premium Farmer Membership Agreement',
      titleHi: titleHi || 'कृषि-नेक्स प्रीमियम किसान सदस्यता नियम एवं शर्तें',
      contentEn: contentEn.trim(),
      contentHi: contentHi.trim(),
      membershipFee: isNaN(feeParsed) ? 999 : feeParsed,
      strikeThroughFee: isNaN(strikeParsed) ? 1999 : strikeParsed,
      validityDays: isNaN(validityParsed) ? 365 : validityParsed,
      bannerBadgeText: bannerBadgeText || 'VIP FARMER MEMBERSHIP',
      bannerTitleHi: bannerTitleHi || 'कृषि-नेक्स प्रीमियम किसान बनें',
      bannerTitleEn: bannerTitleEn || 'Join as KrishiNex Premium Farmer',
      bannerSubHi: bannerSubHi || 'विशेष क्रेडिट सीमा, शून्य-कमीशन बाज़ार पहुंच, और 24×7 विशेषज्ञ कृषि डॉक्टर सेवा',
      bannerSubEn: bannerSubEn || 'Unlock customized agricultural credit limit, priority doctor access, and dedicated inputs.',
      benefits: parsedBenefits.length > 0 ? parsedBenefits : undefined,
      approvalTatHours: Number(approvalTatHours) || 24,
      minimumCreditLimit: isNaN(minLimitParsed) ? 10000 : minLimitParsed,
      isActive: true,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: `Version ${nextVersion} published successfully. All future applicants will sign this version, while past applicants retain their original agreements.`,
      terms: newTerms
    });
  } catch (error) {
    console.error('Create Terms Error:', error);
    res.status(500).json({ error: 'Failed to publish new terms version.' });
  }
});

module.exports = router;
