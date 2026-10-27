const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MilkSubscription = require('../models/MilkSubscription');
const MilkDailyLog = require('../models/MilkDailyLog');
const MilkConfig = require('../models/MilkConfig');
const MilkPauseRequest = require('../models/MilkPauseRequest');
const { sendNotification } = require('../services/notificationService');

// Helper to get or initialize MilkConfig
async function getOrCreateConfig() {
  let config = await MilkConfig.findOne({ configKey: 'global_milk_config' });
  if (!config) {
    config = await MilkConfig.create({
      configKey: 'global_milk_config',
      withdrawalCycleDays: 7,
      defaultSellRate: 45,
      defaultBuyRate: 60,
      minAdvancePauseDays: 1,
      minAdvancePauseHours: 24,
      maxAutoApprovePauseDays: 7,
      minPartnerWalletBalance: 500,
      adminCommissionPercent: 10,
      cancellationAgreementText: 'I agree that cancelling milk service will stop all upcoming deliveries and collections. Any pending settlements will be processed in accordance with KrishiNex Milk Services terms.'
    });
  } else {
    // Ensure new fields exist on existing config
    let needSave = false;
    if (config.minPartnerWalletBalance === undefined) {
      config.minPartnerWalletBalance = 500;
      needSave = true;
    }
    if (config.adminCommissionPercent === undefined) {
      config.adminCommissionPercent = 10;
      needSave = true;
    }
    if (needSave) await config.save();
  }
  return config;
}

// Realtime WebSocket broadcast helper
function notifyRealtime(eventData, targetUserId = null) {
  try {
    if (!global.io) return;
    // Notify admin dashboard room
    global.io.to('admin_room').emit('milk_event', eventData);
    
    // Notify targeted user room specifically so unrelated users' screens do NOT reload
    if (targetUserId) {
      global.io.to(`user_${targetUserId}`).emit('milk_event', eventData);
    }
  } catch (e) {
    console.error('[Socket.io Milk Error]:', e.message);
  }
}

// ----------------------------------------------------
// FARMER / USER ENDPOINTS
// ----------------------------------------------------

// @route   POST /api/milk/register
// @desc    Submit registration to Sell or Buy milk
// @access  Private (Farmer/User)
router.post('/register', protect, async (req, res) => {
  try {
    const {
      type, // 'sell' | 'buy'
      name,
      phone,
      email,
      address,
      landmark,
      dailyQuantityLiters,
      deliverySchedule
    } = req.body;

    if (!type || !['sell', 'buy'].includes(type)) {
      return res.status(400).json({ error: 'Valid subscription type (sell or buy) is required' });
    }

    if (!name || !phone || !address || !dailyQuantityLiters) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if farmer/user is verified
    const user = await User.findById(req.user.id);
    const isVerified = user && (user.status === 'approved' || user.kycStatus === 'verified');
    if (!isVerified) {
      return res.status(403).json({
        error: 'दूध सेवा (Milk Service) पंजीकरण के लिए आपका किसान खाता सत्यापित (Verified / Approved) होना अनिवार्य है। कृपया पहले अपनी KYC / प्रोफ़ाइल सत्यापन कराएं।'
      });
    }

    const qty = Number(dailyQuantityLiters);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Daily quantity must be greater than zero' });
    }

    // Check if an active or pending subscription already exists for this user (Buy or Sell)
    const existing = await MilkSubscription.findOne({
      userId: req.user.id,
      status: { $in: ['pending', 'approved', 'paused'] }
    });

    if (existing) {
      const typeLabel = existing.type === 'sell' ? 'दूध बिक्री (Sell Milk)' : 'दूध खरीद (Buy Milk)';
      const statusLabel = existing.status === 'pending' ? 'समीक्षाधीन (Pending Approval)' : 'सक्रिय (Active)';
      return res.status(400).json({
        error: `आपका पहले से ही ${typeLabel} का आवेदन ${statusLabel} स्थिति में है। एक समय में केवल एक ही दूध सदस्यता की अनुमति है।`
      });
    }

    const config = await getOrCreateConfig();
    const defaultRate = type === 'sell' ? config.defaultSellRate : config.defaultBuyRate;

    const subscription = await MilkSubscription.create({
      userId: req.user.id,
      type,
      name,
      phone,
      email: email || '',
      address,
      landmark: landmark || '',
      dailyQuantityLiters: qty,
      deliverySchedule: deliverySchedule || (type === 'sell' ? 'Morning Only' : 'Morning Only'),
      status: 'pending',
      ratePerLiter: defaultRate
    });

    notifyRealtime({
      action: 'request_created',
      type,
      subscription,
      message: `New ${type === 'sell' ? 'Dairy Farmer' : 'Milk Consumer'} request from ${name}`
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: `Your ${type} milk request has been submitted for admin approval.`,
      subscription
    });
  } catch (error) {
    console.error('Milk Register Error:', error);
    res.status(500).json({ error: 'Failed to submit milk registration. Please try again.' });
  }
});

// @route   GET /api/milk/my-subscription
// @desc    Get user's current subscription by type or find any active/pending subscription
// @access  Private
router.get('/my-subscription', protect, async (req, res) => {
  try {
    const { type } = req.query; // 'sell' | 'buy' | 'any'

    let subscription = null;

    if (type && ['sell', 'buy'].includes(type)) {
      subscription = await MilkSubscription.findOne({
        userId: req.user.id,
        type
      }).populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl').sort({ createdAt: -1 });
    } else {
      // Find active or pending subscription first
      subscription = await MilkSubscription.findOne({
        userId: req.user.id,
        status: { $in: ['pending', 'approved', 'paused'] }
      }).populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl').sort({ updatedAt: -1 });

      // If none active, find latest (e.g. cancelled)
      if (!subscription) {
        subscription = await MilkSubscription.findOne({
          userId: req.user.id
        }).populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl').sort({ createdAt: -1 });
      }
    }

    const user = await User.findById(req.user.id).select('walletBalance milkCycleStartDate milkCycleAccumulatedAmount lastMilkWithdrawalAt');

    res.json({
      success: true,
      subscription: subscription || null,
      walletBalance: user?.walletBalance || 0
    });
  } catch (error) {
    console.error('Fetch My Subscription Error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details.' });
  }
});

// @route   GET /api/milk/history
// @desc    Get date-wise milk daily logs for the logged in user
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { type, month, year, shift, status, startDate, endDate } = req.query;
    if (!type || !['sell', 'buy'].includes(type)) {
      return res.status(400).json({ error: 'Valid subscription type (sell or buy) is required' });
    }

    let query = {
      userId: req.user.id,
      type
    };

    if (shift && ['Morning', 'Evening'].includes(shift)) {
      query.shift = shift;
    }

    if (status && ['Completed', 'Skipped', 'Paused'].includes(status)) {
      query.status = status;
    }

    if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query.date = { $gte: s, $lte: e };
    } else if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const logs = await MilkDailyLog.find(query)
      .populate('performedBy', 'name phone profilePhotoUrl vehicleNumber vehicleType assignedRoute')
      .sort({ date: -1, shift: -1 })
      .limit(300);

    // Find active, pending, or latest subscription
    let subscription = await MilkSubscription.findOne({
      userId: req.user.id,
      type,
      status: { $in: ['pending', 'approved', 'paused'] }
    }).populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl').sort({ createdAt: -1 });

    if (!subscription) {
      subscription = await MilkSubscription.findOne({
        userId: req.user.id,
        type
      }).populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl').sort({ createdAt: -1 });
    }

    const user = await User.findById(req.user.id).select('walletBalance');

    res.json({
      success: true,
      logs,
      subscription,
      walletBalance: user?.walletBalance || 0
    });
  } catch (error) {
    console.error('Fetch Milk History Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk history.' });
  }
});

// @route   GET /api/milk/config
// @desc    Get milk service configuration (advance days notice, auto approve limit, rates, shift times)
// @access  Public / Private
router.get('/config', async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Fetch Config Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk configuration.' });
  }
});

// @route   POST /api/milk/pause
// @desc    Temporarily pause milk service with advance notice check and immutable pause audit logging
// @access  Private
router.post('/pause', protect, async (req, res) => {
  try {
    const { subscriptionId, pauseStartDate, expectedResumeDate, pauseReason, pauseShift } = req.body;
    const validatedShift = ['Both', 'Morning', 'Evening'].includes(pauseShift) ? pauseShift : 'Both';

    if (!subscriptionId || !pauseStartDate || !expectedResumeDate) {
      return res.status(400).json({ error: 'Subscription ID, start date, and resume date are required.' });
    }

    const sub = await MilkSubscription.findOne({ _id: subscriptionId, userId: req.user.id });
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    const config = await getOrCreateConfig();
    const minAdvanceHours = config.minAdvancePauseHours !== undefined 
      ? config.minAdvancePauseHours 
      : ((config.minAdvancePauseDays || 1) * 24);
    const maxAutoApproveDays = config.maxAutoApprovePauseDays !== undefined ? config.maxAutoApprovePauseDays : 7;

    const startDate = new Date(pauseStartDate);
    const resumeDate = new Date(expectedResumeDate);

    // Calculate normalized day differences (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    const resumeDay = new Date(resumeDate);
    resumeDay.setHours(0, 0, 0, 0);

    if (resumeDay < startDay) {
      return res.status(400).json({ error: 'पुनः शुरू होने की तारीख रोक प्रारंभ तारीख से पहले नहीं हो सकती।' });
    }

    // Exact advance notice calculation in calendar days
    const minDaysRequired = config.minAdvancePauseDays !== undefined 
      ? config.minAdvancePauseDays 
      : Math.ceil((config.minAdvancePauseHours || 24) / 24);

    const advanceNoticeDays = Math.round((startDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const nowMs = Date.now();
    const startMs = startDate.getTime();
    const advanceNoticeHours = Math.max(0, Math.round((startMs - nowMs) / (1000 * 60 * 60)));

    if (advanceNoticeDays < minDaysRequired) {
      return res.status(400).json({
        error: `कम से कम ${minDaysRequired} दिन पूर्व सूचना देना अनिवार्य है। कृपया उचित तारीख चुनें।`
      });
    }

    // Duration calculation: inclusive count of days (e.g., 26th to 28th = 26, 27, 28 -> 3 days; 26th to 26th = 1 day)
    const rawDiffDays = Math.round((resumeDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = rawDiffDays + 1;
    const isAutoApprove = durationDays <= maxAutoApproveDays;

    // 1. IMMUTABLE PERMANENT AUDIT LOG: Create MilkPauseRequest record (NEVER OVERWRITTEN)
    const pauseRecord = await MilkPauseRequest.create({
      subscriptionId: sub._id,
      userId: req.user.id,
      type: sub.type,
      name: sub.name,
      phone: sub.phone,
      address: sub.address || '',
      dailyQuantityLiters: sub.dailyQuantityLiters || 0,
      pauseStartDate: startDate,
      expectedResumeDate: resumeDate,
      pauseDurationDays: durationDays,
      pauseReason: pauseReason || 'Temporarily paused by user',
      pauseShift: validatedShift,
      requestedAt: new Date(),
      advanceNoticeHours,
      approvalStatus: isAutoApprove ? 'auto_approved' : 'pending_approval',
      lifecycleStatus: isAutoApprove ? 'active_pause' : 'pending_review'
    });

    // 2. Update active pointer on MilkSubscription
    sub.pauseStartDate = startDate;
    sub.expectedResumeDate = resumeDate;
    sub.pauseReason = pauseReason || sub.pauseReason || 'Temporarily paused by user';
    sub.pauseShift = validatedShift;
    sub.pauseRequestedDays = durationDays;
    sub.pauseRequestedAt = new Date();

    if (isAutoApprove) {
      sub.status = 'paused';
      sub.pauseApprovalStatus = 'auto_approved';
    } else {
      // Greater than maxAutoApproveDays requires admin approval
      sub.pauseApprovalStatus = 'pending_approval';
    }

    await sub.save();

    notifyRealtime({
      action: isAutoApprove ? 'service_paused' : 'pause_request_submitted',
      subscription: sub,
      pauseRecord,
      message: isAutoApprove 
        ? `${sub.name} की दूध सेवा ${durationDays} दिन के लिए स्वतः रोक दी गई है।`
        : `${sub.name} ने ${durationDays} दिन की रोक के लिए आवेदन किया है (एडमिन अनुमोदन प्रतीक्षित)`
    }, req.user.id);

    res.json({
      success: true,
      autoApproved: isAutoApprove,
      message: isAutoApprove 
        ? `सेवा ${durationDays} दिन के लिए स्वतः रोक दी गई है।` 
        : `आपका रोक अनुरोध (${durationDays} दिन) एडमिन अनुमोदन के लिए भेज दिया गया है (${maxAutoApproveDays} दिन से अधिक)।`,
      subscription: sub,
      pauseRecord
    });
  } catch (error) {
    console.error('Pause Milk Service Error:', error);
    res.status(500).json({ error: 'Failed to pause service.' });
  }
});

// @route   POST /api/milk/extend-pause
// @desc    Extend pause duration with immutable extension audit history
// @access  Private
router.post('/extend-pause', protect, async (req, res) => {
  try {
    const { subscriptionId, newResumeDate, reason } = req.body;
    if (!subscriptionId || !newResumeDate) {
      return res.status(400).json({ error: 'Subscription ID and new resume date are required.' });
    }

    const sub = await MilkSubscription.findOne({ _id: subscriptionId, userId: req.user.id });
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    const config = await getOrCreateConfig();
    const maxAutoApproveDays = config.maxAutoApprovePauseDays !== undefined ? config.maxAutoApprovePauseDays : 7;

    const startDate = sub.pauseStartDate ? new Date(sub.pauseStartDate) : new Date();
    const newEnd = new Date(newResumeDate);

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(newEnd);
    endDay.setHours(0, 0, 0, 0);

    if (endDay <= startDay) {
      return res.status(400).json({ error: 'नई समाप्ति तारीख रोक शुरू होने की तारीख के बाद होनी चाहिए।' });
    }

    const totalDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isAutoApprove = totalDays <= maxAutoApproveDays;

    // Find active MilkPauseRequest record to append extension history
    let pauseRecord = await MilkPauseRequest.findOne({
      subscriptionId: sub._id,
      lifecycleStatus: { $in: ['active_pause', 'pending_review', 'extended'] }
    }).sort({ createdAt: -1 });

    if (pauseRecord) {
      const prevResume = pauseRecord.expectedResumeDate;
      const additionalDays = Math.max(0, Math.round((endDay.getTime() - new Date(prevResume).getTime()) / (1000 * 60 * 60 * 24)));

      pauseRecord.extensionHistory.push({
        extendedAt: new Date(),
        previousResumeDate: prevResume,
        newResumeDate: newEnd,
        extendedDays: additionalDays,
        reason: reason || '',
        approvalStatus: isAutoApprove ? 'auto_approved' : 'pending_approval'
      });

      pauseRecord.expectedResumeDate = newEnd;
      pauseRecord.pauseDurationDays = totalDays;
      pauseRecord.lifecycleStatus = isAutoApprove ? 'extended' : 'pending_review';
      if (!isAutoApprove) {
        pauseRecord.approvalStatus = 'pending_approval';
      }
      await pauseRecord.save();
    }

    sub.expectedResumeDate = newEnd;
    if (reason) sub.pauseReason = reason;
    sub.pauseRequestedDays = totalDays;
    sub.pauseApprovalStatus = isAutoApprove ? 'auto_approved' : 'pending_approval';

    if (isAutoApprove) {
      sub.status = 'paused';
    }

    await sub.save();

    notifyRealtime({
      action: 'pause_extended',
      subscription: sub,
      message: `${sub.name} ने रोक अवधि बढ़ाकर ${totalDays} दिन करने का अनुरोध किया है`
    }, req.user.id);

    res.json({
      success: true,
      autoApproved: isAutoApprove,
      message: isAutoApprove 
        ? `रोक अवधि बढ़ाकर ${totalDays} दिन कर दी गई है।`
        : `रोक अवधि (${totalDays} दिन) के लिए एडमिन अनुमोदन आवश्यक है। अनुरोध भेज दिया गया है।`,
      subscription: sub,
      pauseRecord
    });
  } catch (error) {
    console.error('Extend Pause Error:', error);
    res.status(500).json({ error: 'Failed to extend pause period.' });
  }
});

// @route   POST /api/milk/resume
// @desc    Resume paused milk service (persisting audit history permanently in MilkPauseRequest)
// @access  Private
router.post('/resume', protect, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const sub = await MilkSubscription.findOne({ _id: subscriptionId, userId: req.user.id });
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    // Mark all active pause requests as resumed with actualResumedDate (NO DELETION OR OVERWRITE)
    await MilkPauseRequest.updateMany(
      {
        subscriptionId: sub._id,
        lifecycleStatus: { $in: ['active_pause', 'pending_review', 'extended'] }
      },
      {
        $set: {
          actualResumedDate: new Date(),
          lifecycleStatus: 'resumed'
        }
      }
    );

    sub.status = 'approved';
    sub.pauseStartDate = null;
    sub.expectedResumeDate = null;
    sub.pauseApprovalStatus = 'none';
    sub.pauseRequestedDays = 0;
    await sub.save();

    notifyRealtime({
      action: 'service_resumed',
      subscription: sub,
      message: `Milk service resumed by ${sub.name}`
    }, req.user.id);

    res.json({
      success: true,
      message: 'दूध सेवा पुनः सफलतापूर्वक शुरू कर दी गई है। पिछला रोक इतिहास सुरक्षित है।',
      subscription: sub
    });
  } catch (error) {
    console.error('Resume Milk Service Error:', error);
    res.status(500).json({ error: 'Failed to resume service.' });
  }
});

// @route   GET /api/milk/pause-history
// @desc    Get user's complete personal pause history (unalterable ledger)
// @access  Private
router.get('/pause-history', protect, async (req, res) => {
  try {
    const history = await MilkPauseRequest.find({ userId: req.user.id }).sort({ requestedAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    console.error('User Pause History Error:', error);
    res.status(500).json({ error: 'Failed to fetch pause history.' });
  }
});

// @route   POST /api/milk/cancel
// @desc    Cancel milk service with agreement confirmation
// @access  Private
router.post('/cancel', protect, async (req, res) => {
  try {
    const { subscriptionId, cancellationReason, cancellationAgreementAccepted } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required.' });
    }

    if (!cancellationAgreementAccepted) {
      return res.status(400).json({ error: 'You must accept the cancellation terms and agreement before proceeding.' });
    }

    const sub = await MilkSubscription.findOne({ _id: subscriptionId, userId: req.user.id });
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    if (sub.cancellationStatus === 'pending_approval') {
      return res.status(400).json({ error: 'Cancellation request is already submitted and pending admin review.' });
    }

    sub.cancellationStatus = 'pending_approval';
    sub.cancellationReason = cancellationReason || 'Cancelled by user';
    sub.cancellationAgreementAccepted = true;
    sub.cancellationRequestedAt = new Date();
    await sub.save();

    notifyRealtime({
      action: 'cancellation_requested',
      subscription: sub,
      message: `Milk service cancellation requested by ${sub.name}`
    }, req.user.id);

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully and is pending admin approval.',
      subscription: sub
    });
  } catch (error) {
    console.error('Cancel Milk Service Error:', error);
    res.status(500).json({ error: 'Failed to cancel service.' });
  }
});

// @route   POST /api/milk/request-shift-change
// @desc    Submit request to switch delivery / collection schedule (Morning, Evening, Both)
// @access  Private
router.post('/request-shift-change', protect, async (req, res) => {
  try {
    const { subscriptionId, requestedSchedule, reason } = req.body;
    const validSchedules = ['Morning and Evening', 'Morning Only', 'Evening Only'];

    if (!subscriptionId || !requestedSchedule || !validSchedules.includes(requestedSchedule)) {
      return res.status(400).json({ error: 'मान्य सदस्यता आईडी और नई शिफ्ट चुनना अनिवार्य है।' });
    }

    const sub = await MilkSubscription.findOne({ _id: subscriptionId, userId: req.user.id });
    if (!sub) {
      return res.status(404).json({ error: 'सदस्यता नहीं मिली।' });
    }

    if (sub.deliverySchedule === requestedSchedule) {
      return res.status(400).json({ error: 'आपकी वर्तमान शिफ्ट पहले से ही यही है।' });
    }

    if (sub.shiftChangeStatus === 'pending_approval') {
      return res.status(400).json({ error: 'आपका एक शिफ्ट बदलाव अनुरोध पहले से समीक्षाधीन है।' });
    }

    sub.requestedSchedule = requestedSchedule;
    sub.shiftChangeReason = reason || '';
    sub.shiftChangeStatus = 'pending_approval';
    sub.shiftChangeRequestedAt = new Date();
    await sub.save();

    notifyRealtime({
      action: 'shift_change_requested',
      subscription: sub,
      message: `${sub.name} ने शिफ्ट बदलाव का अनुरोध किया है (${sub.deliverySchedule} -> ${requestedSchedule})`
    }, req.user.id);

    res.json({
      success: true,
      message: 'शिफ्ट बदलाव अनुरोध सफलतापूर्वक दर्ज कर दिया गया है। एडमिन समीक्षा के बाद यह लागू हो जाएगा।',
      subscription: sub
    });
  } catch (error) {
    console.error('Request Shift Change Error:', error);
    res.status(500).json({ error: 'Failed to request shift change.' });
  }
});

// @route   POST /api/milk/admin/approve-shift-change/:id
// @desc    Admin approve shift change request
// @access  Private
router.post('/admin/approve-shift-change/:id', protect, async (req, res) => {
  try {
    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!sub.requestedSchedule) {
      return res.status(400).json({ error: 'No pending shift change request found.' });
    }

    const oldSchedule = sub.deliverySchedule;
    sub.deliverySchedule = sub.requestedSchedule;
    sub.requestedSchedule = '';
    sub.shiftChangeStatus = 'approved';
    sub.shiftChangeAdminRemarks = req.body.remarks || 'Approved by admin';
    await sub.save();

    notifyRealtime({
      action: 'shift_change_approved',
      subscription: sub,
      message: `आपकी शिफ्ट सफलता से ${sub.deliverySchedule} में बदल दी गई है।`
    }, sub.userId);

    res.json({
      success: true,
      message: `शिफ्ट सफलता से ${oldSchedule} से ${sub.deliverySchedule} में बदल दी गई है।`,
      subscription: sub
    });
  } catch (error) {
    console.error('Approve Shift Change Error:', error);
    res.status(500).json({ error: 'Failed to approve shift change.' });
  }
});

// @route   POST /api/milk/admin/reject-shift-change/:id
// @desc    Admin reject shift change request
// @access  Private
router.post('/admin/reject-shift-change/:id', protect, async (req, res) => {
  try {
    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    sub.requestedSchedule = '';
    sub.shiftChangeStatus = 'rejected';
    sub.shiftChangeAdminRemarks = req.body.remarks || 'Rejected by admin';
    await sub.save();

    notifyRealtime({
      action: 'shift_change_rejected',
      subscription: sub,
      message: 'आपका शिफ्ट बदलाव अनुरोध अस्वीकृत कर दिया गया है।'
    }, sub.userId);

    res.json({
      success: true,
      message: 'शिफ्ट बदलाव अनुरोध अस्वीकृत कर दिया गया है।',
      subscription: sub
    });
  } catch (error) {
    console.error('Reject Shift Change Error:', error);
    res.status(500).json({ error: 'Failed to reject shift change.' });
  }
});

// @route   GET /api/milk/sell/cycle-status
// @desc    Get 7-day rollout status, countdown and accumulated unwithdrawn balance for milk seller
// @access  Private
router.get('/sell/cycle-status', protect, async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const cycleDurationDays = config.withdrawalCycleDays || 7;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch unwithdrawn completed sell logs for this farmer
    const unwithdrawnLogs = await MilkDailyLog.find({
      userId: user._id,
      type: 'sell',
      status: 'Completed',
      isProcessedInWithdrawal: false
    }).sort({ date: 1 });

    const accumulatedAmount = unwithdrawnLogs.reduce((acc, log) => acc + (log.totalAmount || 0), 0);

    // Determine true cycle start date from earliest unwithdrawn log
    let cycleStartDate = null;
    if (unwithdrawnLogs.length > 0) {
      cycleStartDate = unwithdrawnLogs[0].date;
      if (!user.milkCycleStartDate || new Date(user.milkCycleStartDate).getTime() > new Date(cycleStartDate).getTime()) {
        user.milkCycleStartDate = cycleStartDate;
        await user.save();
      }
    } else {
      cycleStartDate = user.milkCycleStartDate || new Date();
    }

    // Normalize to calendar day midnights (00:00:00) so date transitions occur cleanly at midnight
    const startDate = new Date(cycleStartDate);
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Difference in calendar days (0 on same day, 1 on next day, etc.)
    const diffDays = Math.max(0, Math.round((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));

    // Current cycle day: Day 1 on start day, Day 2 on next day, up to cycleDurationDays
    const currentCycleDay = accumulatedAmount > 0 ? Math.min(cycleDurationDays, diffDays + 1) : 0;
    const elapsedDays = Math.min(cycleDurationDays, diffDays);
    const daysRemaining = Math.max(0, cycleDurationDays - diffDays);

    const isEligible = diffDays >= cycleDurationDays && accumulatedAmount > 0;
    const nextEligibleDate = new Date(startMidnight.getTime() + cycleDurationDays * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      cycleDurationDays,
      currentCycleDay,
      elapsedDays,
      daysRemaining,
      accumulatedAmount,
      isEligible,
      cycleStartDate,
      nextEligibleDate,
      walletBalance: user.walletBalance || 0
    });
  } catch (error) {
    console.error('Cycle Status Error:', error);
    res.status(500).json({ error: 'Failed to retrieve cycle status.' });
  }
});

// @route   POST /api/milk/sell/request-withdrawal
// @desc    Withdraw accumulated 7-day milk supply earnings directly into Main Wallet
// @access  Private
router.post('/sell/request-withdrawal', protect, async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const cycleDurationDays = config.withdrawalCycleDays || 7;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch unwithdrawn completed logs
    const logs = await MilkDailyLog.find({
      userId: user._id,
      type: 'sell',
      status: 'Completed',
      isProcessedInWithdrawal: false
    }).sort({ date: 1 });

    if (!logs || logs.length === 0) {
      return res.status(400).json({ error: 'No accumulated earnings available for withdrawal.' });
    }

    // Validate cycle timeline using calendar days from earliest unwithdrawn log
    const cycleStartDate = logs[0].date || user.milkCycleStartDate || user.createdAt;
    const startDate = new Date(cycleStartDate);
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const nowMidnight = new Date();
    nowMidnight.setHours(0, 0, 0, 0);

    const diffDays = Math.max(0, Math.round((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));

    if (diffDays < cycleDurationDays) {
      const remaining = Math.max(1, cycleDurationDays - diffDays);
      return res.status(400).json({
        error: `Withdrawal not available yet. Please complete the ${cycleDurationDays}-day cycle. ${remaining} day(s) remaining.`
      });
    }

    const withdrawalAmount = logs.reduce((acc, log) => acc + (log.totalAmount || 0), 0);

    if (withdrawalAmount <= 0) {
      return res.status(400).json({ error: 'No accumulated earnings available for withdrawal.' });
    }

    // Atomically claim and lock unwithdrawn logs to prevent race conditions on concurrent taps
    const logIds = logs.map(l => l._id);
    const updateResult = await MilkDailyLog.updateMany(
      {
        _id: { $in: logIds },
        isProcessedInWithdrawal: false
      },
      {
        $set: {
          isProcessedInWithdrawal: true,
          withdrawalTransactionId: transactionId
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ error: 'Withdrawal already processed or pending.' });
    }

    // Update user wallet balance directly
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { walletBalance: Number(withdrawalAmount) },
        $set: {
          milkCycleStartDate: new Date(),
          lastMilkWithdrawalAt: new Date(),
          milkCycleAccumulatedAmount: 0
        }
      },
      { new: true }
    );

    // Create Transaction record in shared ledger
    const txn = await Transaction.create({
      transactionId,
      recipient: user._id,
      module: 'Milk',
      amount: Number(withdrawalAmount),
      type: 'Credit',
      paymentMode: 'NexCard Wallet',
      status: 'Completed',
      note: `Milk Supply 7-Day Cycle Payout (${logs.length} collections)`
    });

    notifyRealtime({
      action: 'withdrawal_processed',
      userId: user._id,
      amount: withdrawalAmount,
      transactionId,
      message: `Milk supply earnings ₹${withdrawalAmount} transferred directly to wallet for ${user.name}`
    }, user._id);

    res.json({
      success: true,
      message: `₹${withdrawalAmount} has been transferred directly into your main KrishiNex wallet.`,
      transferredAmount: withdrawalAmount,
      newWalletBalance: updatedUser.walletBalance,
      transactionId,
      nextCycleStartDate: updatedUser.milkCycleStartDate
    });
  } catch (error) {
    console.error('Request Withdrawal Error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal to wallet.' });
  }
});

// ----------------------------------------------------
// DAILY LOG ENTRY (PARTNER & TESTING DISPATCH)
// ----------------------------------------------------

// @route   POST /api/milk/daily-log
// @desc    Record a daily milk collection or delivery (instant debit for buyers, rollout credit for sellers)
// @access  Private (Partner / Admin)
router.post('/daily-log', protect, async (req, res) => {
  try {
    const {
      subscriptionId,
      shift, // 'Morning' | 'Evening'
      quantityLiters,
      notes
    } = req.body;

    const sub = await MilkSubscription.findById(subscriptionId).populate('userId');
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (sub.status !== 'approved') {
      return res.status(400).json({ error: `Cannot log delivery for a ${sub.status} subscription.` });
    }

    const qty = Number(quantityLiters) || sub.dailyQuantityLiters;
    const rate = sub.ratePerLiter || 0;
    const totalAmount = Math.round(qty * rate);
    const date = new Date();

    let debitTxnId = '';

    // If BUY MILK: Instant deduction from buyer's main KrishiNex wallet
    if (sub.type === 'buy') {
      const buyer = await User.findById(sub.userId._id);
      if (buyer.walletBalance < totalAmount) {
        // We still record the delivery, but warn or mark debit status
        console.warn(`Buyer ${buyer.name} has low wallet balance: ₹${buyer.walletBalance}. Required: ₹${totalAmount}`);
      }

      // Deduct from buyer wallet
      await User.findByIdAndUpdate(buyer._id, {
        $inc: { walletBalance: -Number(totalAmount) }
      });

      debitTxnId = `TXN_MILK_BUY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      // Create Transaction record in shared ledger
      await Transaction.create({
        transactionId: debitTxnId,
        recipient: buyer._id,
        module: 'Milk',
        amount: Number(totalAmount),
        type: 'Debit',
        paymentMode: 'NexCard Wallet',
        status: 'Completed',
        note: `Daily Milk Purchase Deduction (${qty}L @ ₹${rate}/L)`
      });
    }

    // Save Daily Log
    const log = await MilkDailyLog.create({
      subscriptionId: sub._id,
      userId: sub.userId._id,
      type: sub.type,
      date,
      shift: shift || 'Morning',
      quantityLiters: qty,
      ratePerLiter: rate,
      totalAmount,
      status: 'Completed',
      performedBy: req.user.id,
      debitTransactionId: debitTxnId,
      notes: notes || ''
    });

    // If SELL MILK: Initialize user's milkCycleStartDate if not set
    if (sub.type === 'sell') {
      const seller = await User.findById(sub.userId._id);
      if (!seller.milkCycleStartDate) {
        seller.milkCycleStartDate = date;
      }
      seller.milkCycleAccumulatedAmount = (seller.milkCycleAccumulatedAmount || 0) + totalAmount;
      await seller.save();
    }

    notifyRealtime({
      action: 'daily_log_recorded',
      log,
      message: `Milk ${sub.type === 'sell' ? 'collection' : 'delivery'} recorded: ${qty}L for ${sub.name}`
    }, sub.userId._id);

    res.status(201).json({
      success: true,
      message: `Milk ${sub.type} log recorded successfully.`,
      log,
      debitTransactionId: debitTxnId || null
    });
  } catch (error) {
    console.error('Daily Log Error:', error);
    res.status(500).json({ error: 'Failed to record daily log.' });
  }
});

// ----------------------------------------------------
// ADMIN ENDPOINTS
// ----------------------------------------------------

// @route   GET /api/milk/admin/requests
// @desc    List all milk subscription requests with filtering
// @access  Private/Admin
router.get('/admin/requests', protect, async (req, res) => {
  try {
    const { type, status, search } = req.query;
    let query = {};

    if (type && type !== 'all') query.type = type;
    if (status === 'shift_change') {
      query.shiftChangeStatus = 'pending_approval';
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { address: regex }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limitParam = parseInt(req.query.limit);
    // If limit is explicitly provided, enforce pagination; default to safe upper bound of 1000 for legacy unpaginated calls
    const limit = (limitParam && limitParam > 0) ? Math.min(limitParam, 500) : 1000;
    const skip = (page - 1) * limit;

    const total = await MilkSubscription.countDocuments(query);
    const shiftChangePendingCount = await MilkSubscription.countDocuments({ shiftChangeStatus: 'pending_approval' });
    const requests = await MilkSubscription.find(query)
      .populate('userId', 'name phone walletBalance')
      .populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      requests,
      shiftChangePendingCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk requests.' });
  }
});

// @route   PUT /api/milk/admin/requests/:id/shift-change
// @desc    Approve or reject a shift change request
// @access  Private/Admin
router.put('/admin/requests/:id/shift-change', protect, async (req, res) => {
  try {
    const { action, adminRemarks } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected.' });
    }

    const subscription = await MilkSubscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    if (subscription.shiftChangeStatus !== 'pending_approval') {
      return res.status(400).json({ error: 'No pending shift change request on this subscription.' });
    }

    if (action === 'approved') {
      const oldSchedule = subscription.deliverySchedule;
      subscription.deliverySchedule = subscription.requestedSchedule;
      subscription.shiftChangeStatus = 'approved';
      subscription.shiftChangeAdminRemarks = adminRemarks || '';
      await subscription.save();

      notifyRealtime({
        action: 'shift_change_approved',
        subscriptionId: subscription._id,
        userId: subscription.userId,
        oldSchedule,
        newSchedule: subscription.deliverySchedule,
        message: `Your shift change request to ${subscription.deliverySchedule} has been approved!`
      }, subscription.userId);

      return res.json({
        success: true,
        message: `Shift changed to ${subscription.deliverySchedule} successfully!`,
        subscription
      });
    } else {
      subscription.shiftChangeStatus = 'rejected';
      subscription.shiftChangeAdminRemarks = adminRemarks || '';
      await subscription.save();

      notifyRealtime({
        action: 'shift_change_rejected',
        subscriptionId: subscription._id,
        userId: subscription.userId,
        message: `Your shift change request was rejected.${adminRemarks ? ' Reason: ' + adminRemarks : ''}`
      }, subscription.userId);

      return res.json({
        success: true,
        message: 'Shift change request rejected.',
        subscription
      });
    }
  } catch (error) {
    console.error('Shift Change Review Error:', error);
    res.status(500).json({ error: 'Failed to process shift change request.' });
  }
});

// @route   PUT /api/milk/admin/requests/:id/review
// @desc    Approve or reject a milk request, assign milk partner, and configure per-liter rate
// @access  Private/Admin
router.put('/admin/requests/:id/review', protect, async (req, res) => {
  try {
    const { action, ratePerLiter, adminRemarks, assignedPartnerId } = req.body;
    if (!['approved', 'rejected', 'update_rate', 'update_details', 'assign_partner'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approved', 'rejected', 'update_rate', 'update_details', or 'assign_partner'." });
    }

    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (assignedPartnerId !== undefined) {
      const cleanPartnerId = (assignedPartnerId && assignedPartnerId.trim && assignedPartnerId.trim() !== '') ? assignedPartnerId.trim() : null;
      if (cleanPartnerId) {
        const partnerUser = await User.findOne({ _id: cleanPartnerId, role: 'milk_partner' });
        if (!partnerUser) {
          return res.status(400).json({ error: 'चयनित मिल्क पार्टनर मौजूद नहीं है।' });
        }
        if (partnerUser.status === 'blocked') {
          return res.status(400).json({ error: 'यह मिल्क पार्टनर ब्लॉक है। ब्लॉक पार्टनर को असाइन नहीं किया जा सकता।' });
        }
        if (partnerUser.status !== 'approved') {
          return res.status(400).json({ error: 'यह मिल्क पार्टनर अभी स्वीकृत (Approved) नहीं है। केवल स्वीकृत पार्टनर ही असाइन किए जा सकते हैं।' });
        }
        sub.assignedPartnerId = cleanPartnerId;
      } else {
        sub.assignedPartnerId = null;
      }
    }

    if (action === 'update_rate' || action === 'update_details' || action === 'assign_partner') {
      if (ratePerLiter && Number(ratePerLiter) > 0) {
        sub.ratePerLiter = Number(ratePerLiter);
      }
      if (adminRemarks !== undefined) {
        sub.adminRemarks = adminRemarks;
      }
      await sub.save();
      const populatedSub = await MilkSubscription.findById(sub._id)
        .populate('userId', 'name phone walletBalance')
        .populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl');

      notifyRealtime({
        action: 'request_updated',
        subscription: populatedSub,
        message: `Milk request updated (Rate: ₹${sub.ratePerLiter}/L, Partner: ${populatedSub.assignedPartnerId?.name || 'None'})`
      }, sub.userId);

      if (sub.assignedPartnerId) {
        notifyRealtime({
          action: 'farmer_assigned',
          subscription: populatedSub,
          message: `Subscriber ${sub.name} (${sub.type === 'sell' ? 'दूध खरीद' : 'दूध बिक्री'}) assigned to your route`
        }, sub.assignedPartnerId);

        // Send persistent In-App & FCM Push Notification to the Partner
        const isSell = sub.type === 'sell';
        const partnerTitle = isSell ? 'नया दूध आपूर्तिकर्ता असाइन हुआ' : 'नया दूध ग्राहक असाइन हुआ';
        const partnerMsgHi = `${sub.name || 'किसान'} (${sub.shift === 'both' ? 'सुबह व शाम' : sub.shift === 'morning' ? 'सुबह' : 'शाम'}) आपके रूट पर असाइन किया गया है। दैनिक मात्रा: ${sub.quantityLiters} लीटर।`;
        const partnerMsgEn = `New subscriber ${sub.name || 'Farmer'} (${sub.quantityLiters}L/day, ${sub.shift}) has been assigned to your route.`;

        sendNotification(sub.assignedPartnerId, {
          title: partnerTitle,
          messageHi: partnerMsgHi,
          messageEn: partnerMsgEn,
          type: 'farmer_assigned',
          refId: String(sub._id),
          data: {
            subscriptionId: String(sub._id),
            type: 'milk_assignment',
            route: sub.assignedRoute || ''
          }
        }).catch(err => console.error('[Milk Notification Error - Assign Partner]:', err));
      }

      return res.json({
        success: true,
        message: 'Subscription updated successfully.',
        subscription: populatedSub
      });
    }

    sub.status = action;
    sub.adminRemarks = adminRemarks || '';
    if (action === 'approved') {
      if (ratePerLiter && Number(ratePerLiter) > 0) {
        sub.ratePerLiter = Number(ratePerLiter);
      }
      sub.approvedAt = new Date();
      sub.approvedBy = req.user.id;

      // Ensure this user has only ONE active subscription: cancel any other existing active/pending subscription of this user
      await MilkSubscription.updateMany(
        {
          userId: sub.userId,
          _id: { $ne: sub._id },
          status: { $in: ['pending', 'approved', 'paused'] }
        },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: 'Admin approved a new subscription for this farmer/user.',
            cancellationStatus: 'approved',
            cancellationApprovedAt: new Date()
          }
        }
      );
    }

    await sub.save();

    const populatedSub = await MilkSubscription.findById(sub._id)
      .populate('userId', 'name phone walletBalance')
      .populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl');

    notifyRealtime({
      action: 'request_reviewed',
      status: action,
      subscription: populatedSub,
      message: `Farmer milk request has been ${action}!`
    }, sub.userId);

    // Also notify farmer about approval/rejection
    if (action === 'approved') {
      sendNotification(sub.userId, {
        title: 'दूध सेवा स्वीकृत (Milk Service Approved)',
        messageHi: `आपकी दूध ${sub.type === 'sell' ? 'बिक्री' : 'खरीद'} सेवा स्वीकृत हो गई है। दर: ₹${sub.ratePerLiter}/लीटर।`,
        messageEn: `Your milk ${sub.type === 'sell' ? 'selling' : 'purchase'} subscription has been approved at ₹${sub.ratePerLiter}/L.`,
        type: 'milk_subscription',
        refId: String(sub._id),
        data: { subscriptionId: String(sub._id), type: 'milk_subscription', screen: '/milk' }
      }).catch(err => console.error('[Milk Notification Error - Farmer Approved]:', err));
    } else if (action === 'rejected') {
      sendNotification(sub.userId, {
        title: 'दूध सेवा अस्वीकृत (Milk Service Rejected)',
        messageHi: `आपकी दूध ${sub.type === 'sell' ? 'बिक्री' : 'खरीद'} सेवा अस्वीकृत कर दी गई है। कारण: ${adminRemarks || 'कोई विवरण नहीं दिया गया'}।`,
        messageEn: `Your milk ${sub.type === 'sell' ? 'selling' : 'purchase'} subscription was rejected. Reason: ${adminRemarks || 'No remarks provided'}.`,
        type: 'milk_subscription',
        refId: String(sub._id),
        data: { subscriptionId: String(sub._id), type: 'milk_subscription', screen: '/milk' }
      }).catch(err => console.error('[Milk Notification Error - Farmer Rejected]:', err));
    }

    if (sub.assignedPartnerId) {
      notifyRealtime({
        action: 'farmer_assigned',
        subscription: populatedSub,
        message: `Subscriber ${sub.name} assigned to your daily route`
      }, sub.assignedPartnerId);

      // Send persistent In-App & FCM Push Notification to the Partner
      const isSell = sub.type === 'sell';
      const partnerTitle = isSell ? 'नया दूध आपूर्तिकर्ता असाइन हुआ' : 'नया दूध ग्राहक असाइन हुआ';
      const partnerMsgHi = `${sub.name || 'किसान'} (${sub.shift === 'both' ? 'सुबह व शाम' : sub.shift === 'morning' ? 'सुबह' : 'शाम'}) आपके रूट पर असाइन किया गया है। दैनिक मात्रा: ${sub.quantityLiters} लीटर।`;
      const partnerMsgEn = `New subscriber ${sub.name || 'Farmer'} (${sub.quantityLiters}L/day, ${sub.shift}) has been assigned to your route.`;

      sendNotification(sub.assignedPartnerId, {
        title: partnerTitle,
        messageHi: partnerMsgHi,
        messageEn: partnerMsgEn,
        type: 'farmer_assigned',
        refId: String(sub._id),
        data: {
          subscriptionId: String(sub._id),
          type: 'milk_assignment',
          route: sub.assignedRoute || ''
        }
      }).catch(err => console.error('[Milk Notification Error - Partner Notification]:', err));
    }

    res.json({
      success: true,
      message: `Subscription has been ${action}.`,
      subscription: populatedSub
    });
  } catch (error) {
    console.error('Admin Review Error:', error);
    res.status(500).json({ error: 'Failed to review subscription request.' });
  }
});

// @route   PUT /api/milk/admin/requests/:id/toggle-block
// @desc    Admin blocks or unblocks a farmer/user milk subscription
// @access  Private/Admin
router.put('/admin/requests/:id/toggle-block', protect, async (req, res) => {
  try {
    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const isCurrentlyBlocked = sub.status === 'blocked';
    sub.status = isCurrentlyBlocked ? 'approved' : 'blocked';
    if (!isCurrentlyBlocked) {
      sub.adminRemarks = req.body.remarks || 'Blocked by admin';
    }
    await sub.save();

    const populatedSub = await MilkSubscription.findById(sub._id)
      .populate('userId', 'name phone walletBalance')
      .populate('assignedPartnerId', 'name phone assignedRoute vehicleNumber vehicleType profilePhotoUrl');

    notifyRealtime({
      action: 'subscription_block_toggled',
      subscriptionId: sub._id,
      status: sub.status,
      message: `Farmer ${sub.name} milk service has been ${sub.status === 'blocked' ? 'blocked' : 'unblocked'}`
    }, sub.userId);

    res.json({
      success: true,
      status: sub.status,
      isBlocked: sub.status === 'blocked',
      message: `Farmer ${sub.name} milk subscription has been ${sub.status === 'blocked' ? 'blocked' : 'unblocked'}.`,
      subscription: populatedSub
    });
  } catch (error) {
    console.error('Toggle Block Farmer Subscription Error:', error);
    res.status(500).json({ error: 'Failed to toggle farmer block status.' });
  }
});

// @route   GET /api/milk/admin/partners
// @desc    List all milk partner applications & active partners
// @access  Private/Admin
router.get('/admin/partners', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = { role: 'milk_partner' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { address: regex },
        { assignedRoute: regex },
        { vehicleNumber: regex }
      ];
    }

    const partners = await User.find(query).sort({ createdAt: -1 });
    res.json({ success: true, partners });
  } catch (error) {
    console.error('Admin Partners Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk partners.' });
  }
});

// @route   POST /api/milk/admin/partners
// @desc    Create a new milk partner directly from admin
// @access  Private/Admin
router.post('/admin/partners', protect, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      assignedRoute,
      vehicleType,
      vehicleNumber,
      canisterCapacityLiters,
      hasTestingKit,
      status
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Name, phone, and address are required.' });
    }

    let existing = await User.findOne({ phone, role: 'milk_partner' });
    if (existing) {
      return res.status(400).json({ error: 'A milk partner with this phone number already exists.' });
    }

    const partner = new User({
      role: 'milk_partner',
      name,
      phone,
      address,
      assignedRoute: assignedRoute || '',
      vehicleType: vehicleType || 'Bike / Motorcycle',
      vehicleNumber: vehicleNumber || '',
      canisterCapacityLiters: Number(canisterCapacityLiters) || 40,
      hasTestingKit: Boolean(hasTestingKit),
      status: status || 'approved'
    });

    await partner.save();

    notifyRealtime({
      action: 'partner_created',
      partner,
      message: `Milk partner ${partner.name} registered`
    });

    res.status(201).json({
      success: true,
      message: 'Milk partner registered successfully.',
      partner
    });
  } catch (error) {
    console.error('Create Milk Partner Error:', error);
    res.status(500).json({ error: 'Failed to create milk partner.' });
  }
});

// @route   PUT /api/milk/admin/partners/:id/review
// @desc    Approve/Reject milk partner application and assign route/equipment
// @access  Private/Admin
router.put('/admin/partners/:id/review', protect, async (req, res) => {
  try {
    const {
      action, // 'approved', 'rejected'
      assignedRoute,
      vehicleType,
      vehicleNumber,
      canisterCapacityLiters,
      hasTestingKit,
      adminRemarks
    } = req.body;

    const partner = await User.findOne({ _id: req.params.id, role: 'milk_partner' });
    if (!partner) {
      return res.status(404).json({ error: 'Milk partner not found.' });
    }

    if (action) {
      if (!['approved', 'rejected', 'pending', 'blocked'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action status.' });
      }
      partner.status = action;
    }

    if (req.body.name !== undefined && req.body.name.trim() !== '') partner.name = req.body.name.trim();
    if (req.body.phone !== undefined && req.body.phone.trim() !== '') partner.phone = req.body.phone.trim();
    if (req.body.address !== undefined) partner.address = req.body.address.trim();
    if (adminRemarks !== undefined) partner.adminRemarks = adminRemarks;
    if (assignedRoute !== undefined) partner.assignedRoute = assignedRoute;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (canisterCapacityLiters !== undefined) partner.canisterCapacityLiters = Number(canisterCapacityLiters);
    if (hasTestingKit !== undefined) partner.hasTestingKit = Boolean(hasTestingKit);

    await partner.save();

    notifyRealtime({
      action: 'partner_reviewed',
      partner,
      message: `Milk partner ${partner.name} updated (${partner.status})`
    });

    res.json({
      success: true,
      message: `Partner status updated to ${partner.status}.`,
      partner
    });
  } catch (error) {
    console.error('Review Partner Error:', error);
    res.status(500).json({ error: 'Failed to review milk partner.' });
  }
});

// @route   PUT /api/milk/admin/partners/:id/toggle-block
// @desc    Admin blocks or unblocks a milk partner
// @access  Private/Admin
router.put('/admin/partners/:id/toggle-block', protect, async (req, res) => {
  try {
    const partner = await User.findOne({ _id: req.params.id, role: 'milk_partner' });
    if (!partner) {
      return res.status(404).json({ error: 'Milk partner not found.' });
    }

    const { block } = req.body;
    const shouldBlock = block !== undefined ? Boolean(block) : (partner.status !== 'blocked');
    partner.status = shouldBlock ? 'blocked' : 'approved';
    await partner.save();

    notifyRealtime({
      action: 'partner_status_changed',
      partnerId: partner._id,
      status: partner.status,
      message: `Partner ${partner.name} has been ${partner.status === 'blocked' ? 'blocked' : 'unblocked'}`
    }, partner._id);

    res.json({
      success: true,
      status: partner.status,
      isBlocked: partner.status === 'blocked',
      message: `Partner ${partner.name} has been successfully ${partner.status === 'blocked' ? 'blocked' : 'unblocked'}.`
    });
  } catch (error) {
    console.error('Toggle Block Partner Error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle partner block status.' });
  }
});

// @route   POST /api/milk/admin/partners/:id/add-money
// @desc    Admin manually credits money into a milk partner's wallet
// @access  Private/Admin
router.post('/admin/partners/:id/add-money', protect, async (req, res) => {
  try {
    const { amount, note, paymentMode } = req.body;
    const addAmt = Number(amount);

    if (isNaN(addAmt) || addAmt <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount.' });
    }

    const partner = await User.findOne({ _id: req.params.id, role: 'milk_partner' });
    if (!partner) {
      return res.status(404).json({ error: 'Milk partner not found.' });
    }

    // Atomically credit partner wallet
    partner.walletBalance = Math.round(((partner.walletBalance || 0) + addAmt) * 100) / 100;
    await partner.save();

    // Create completed transaction
    const tx = await Transaction.create({
      transactionId: 'ADM_CR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      recipient: partner._id,
      module: 'Milk',
      amount: addAmt,
      type: 'Credit',
      paymentMode: paymentMode || 'Cash',
      status: 'Completed',
      performedBy: req.user.id,
      note: note || `Admin wallet recharge of ₹${addAmt}`
    });

    notifyRealtime({
      action: 'partner_wallet_credited',
      partnerId: partner._id,
      amount: addAmt,
      newBalance: partner.walletBalance,
      message: `Admin credited ₹${addAmt} to ${partner.name}'s wallet`
    }, partner._id);

    res.json({
      success: true,
      message: `Successfully credited ₹${addAmt} to ${partner.name}'s wallet. New balance: ₹${partner.walletBalance}.`,
      newBalance: partner.walletBalance,
      transaction: tx
    });
  } catch (error) {
    console.error('Admin Add Money Error:', error);
    res.status(500).json({ error: error.message || 'Failed to add money to partner wallet.' });
  }
});

// @route   GET /api/milk/admin/history
// @desc    Get milk collection and delivery ledger with date and shift filters
// @access  Private/Admin
router.get('/admin/history', protect, async (req, res) => {
  try {
    const { startDate, endDate, shift, type, status, search } = req.query;
    let query = {};

    if (type && type !== 'all') query.type = type;
    if (shift && shift !== 'all') query.shift = shift;
    if (status && status !== 'all') query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    let logs = await MilkDailyLog.find(query)
      .populate('userId', 'name phone address')
      .populate('performedBy', 'name phone')
      .sort({ date: -1, shift: -1 })
      .limit(500);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(log => {
        const userName = log.userId?.name?.toLowerCase() || '';
        const userPhone = log.userId?.phone?.toLowerCase() || '';
        return userName.includes(q) || userPhone.includes(q);
      });
    }

    const totalLiters = logs.reduce((sum, l) => sum + (l.quantityLiters || 0), 0);
    const totalAmount = logs.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
    const completedCount = logs.filter(l => l.status === 'Completed').length;

    res.json({
      success: true,
      summary: {
        totalRecords: logs.length,
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalAmount: Math.round(totalAmount),
        completedCount
      },
      logs
    });
  } catch (error) {
    console.error('Admin Milk History Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk history ledger.' });
  }
});

// @route   GET /api/milk/admin/paused
// @desc    List all temporarily paused milk subscriptions and pending pause approval requests
// @access  Private/Admin
router.get('/admin/paused', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {
      $or: [
        { status: 'paused' },
        { pauseApprovalStatus: 'pending_approval' }
      ]
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $and: [
          {
            $or: [
              { status: 'paused' },
              { pauseApprovalStatus: 'pending_approval' }
            ]
          },
          {
            $or: [
              { name: regex },
              { phone: regex },
              { address: regex }
            ]
          }
        ]
      };
    }

    const pausedSubs = await MilkSubscription.find(query)
      .populate('userId', 'name phone walletBalance')
      .sort({ pauseRequestedAt: -1, pauseStartDate: -1 });

    res.json({ success: true, subscriptions: pausedSubs });
  } catch (error) {
    console.error('Admin Paused Error:', error);
    res.status(500).json({ error: 'Failed to fetch paused subscriptions.' });
  }
});

// @route   PUT /api/milk/admin/subscriptions/:id/review-pause
// @desc    Admin approve or reject pending temporary pause (updates MilkPauseRequest audit record)
// @access  Private/Admin
router.put('/admin/subscriptions/:id/review-pause', protect, async (req, res) => {
  try {
    const { action, adminRemarks } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected.' });
    }

    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    // Update MilkPauseRequest audit record
    const pauseReq = await MilkPauseRequest.findOne({
      subscriptionId: sub._id,
      lifecycleStatus: 'pending_review'
    }).sort({ createdAt: -1 });

    if (pauseReq) {
      pauseReq.approvalStatus = action;
      pauseReq.reviewedBy = req.user.id;
      pauseReq.reviewedAt = new Date();
      pauseReq.adminRemarks = adminRemarks || `Pause ${action} by Admin`;
      pauseReq.lifecycleStatus = action === 'approved' ? 'active_pause' : 'rejected';
      await pauseReq.save();
    }

    if (action === 'approved') {
      sub.status = 'paused';
      sub.pauseApprovalStatus = 'approved';
      sub.adminRemarks = adminRemarks || 'Pause approved by Admin';
    } else {
      // rejected
      sub.status = 'approved'; // keep active
      sub.pauseApprovalStatus = 'rejected';
      sub.adminRemarks = adminRemarks || 'Pause request rejected by Admin';
      sub.pauseStartDate = null;
      sub.expectedResumeDate = null;
      sub.pauseRequestedDays = 0;
    }

    await sub.save();

    notifyRealtime({
      action: action === 'approved' ? 'pause_approved' : 'pause_rejected',
      subscription: sub,
      message: `प्रशासक द्वारा ${sub.name} का रोक अनुरोध ${action === 'approved' ? 'स्वीकृत' : 'अस्वीकृत'} किया गया`
    }, sub.userId);

    res.json({
      success: true,
      message: `Pause request ${action} successfully.`,
      subscription: sub,
      pauseRecord: pauseReq
    });
  } catch (error) {
    console.error('Review Pause Error:', error);
    res.status(500).json({ error: 'Failed to review pause request.' });
  }
});

// @route   PUT /api/milk/admin/subscriptions/:id/resume
// @desc    Resume a paused subscription directly from admin (preserves pause audit record)
// @access  Private/Admin
router.put('/admin/subscriptions/:id/resume', protect, async (req, res) => {
  try {
    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    // Mark MilkPauseRequest as resumed (PERMANENT RETENTION)
    await MilkPauseRequest.updateMany(
      {
        subscriptionId: sub._id,
        lifecycleStatus: { $in: ['active_pause', 'pending_review', 'extended'] }
      },
      {
        $set: {
          actualResumedDate: new Date(),
          lifecycleStatus: 'resumed',
          adminRemarks: req.body.adminRemarks || 'Resumed by Admin via Dashboard'
        }
      }
    );

    sub.status = 'approved';
    sub.pauseStartDate = null;
    sub.expectedResumeDate = null;
    sub.pauseApprovalStatus = 'none';
    sub.pauseRequestedDays = 0;
    sub.adminRemarks = req.body.adminRemarks || sub.adminRemarks || 'Resumed by Admin';
    await sub.save();

    notifyRealtime({
      action: 'service_resumed',
      subscription: sub,
      message: 'Paused milk subscription resumed by Admin'
    }, sub.userId);

    res.json({
      success: true,
      message: 'Subscription resumed successfully. Audit record archived in pause ledger.',
      subscription: sub
    });
  } catch (error) {
    console.error('Resume Subscription Error:', error);
    res.status(500).json({ error: 'Failed to resume subscription.' });
  }
});

// @route   PUT /api/milk/admin/subscriptions/:id/extend-pause
// @desc    Extend pause duration for a subscription
// @access  Private/Admin
router.put('/admin/subscriptions/:id/extend-pause', protect, async (req, res) => {
  try {
    const { expectedResumeDate, pauseReason } = req.body;
    if (!expectedResumeDate) {
      return res.status(400).json({ error: 'Expected resume date is required.' });
    }

    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    const newEnd = new Date(expectedResumeDate);
    const totalDays = Math.max(1, Math.round((newEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Update MilkPauseRequest audit record
    const pauseRecord = await MilkPauseRequest.findOne({
      subscriptionId: sub._id,
      lifecycleStatus: { $in: ['active_pause', 'pending_review', 'extended'] }
    }).sort({ createdAt: -1 });

    if (pauseRecord) {
      pauseRecord.extensionHistory.push({
        extendedAt: new Date(),
        previousResumeDate: pauseRecord.expectedResumeDate,
        newResumeDate: newEnd,
        extendedDays: totalDays - (pauseRecord.pauseDurationDays || 0),
        reason: pauseReason || 'Extended by Admin',
        approvalStatus: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      });
      pauseRecord.expectedResumeDate = newEnd;
      pauseRecord.pauseDurationDays = totalDays;
      pauseRecord.lifecycleStatus = 'extended';
      pauseRecord.approvalStatus = 'approved';
      await pauseRecord.save();
    }

    sub.expectedResumeDate = newEnd;
    if (pauseReason) sub.pauseReason = pauseReason;
    sub.pauseRequestedDays = totalDays;
    sub.pauseApprovalStatus = 'approved';
    await sub.save();

    notifyRealtime({
      action: 'pause_extended',
      subscription: sub,
      message: 'Pause duration extended by Admin'
    }, sub.userId);

    res.json({
      success: true,
      message: 'Pause period extended successfully.',
      subscription: sub,
      pauseRecord
    });
  } catch (error) {
    console.error('Extend Pause Error:', error);
    res.status(500).json({ error: 'Failed to extend pause period.' });
  }
});

// @route   GET /api/milk/admin/pause-history
// @desc    Get complete permanent audit ledger of ALL pause requests (never overwritten or deleted)
// @access  Private/Admin
router.get('/admin/pause-history', protect, async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = {};

    if (type && type !== 'all') query.type = type;

    if (status && status !== 'all') {
      if (status === 'active') {
        query.lifecycleStatus = { $in: ['active_pause', 'extended'] };
      } else if (status === 'resumed') {
        query.lifecycleStatus = 'resumed';
      } else if (status === 'pending') {
        query.lifecycleStatus = 'pending_review';
      } else if (status === 'auto_approved') {
        query.approvalStatus = 'auto_approved';
      } else if (status === 'rejected') {
        query.lifecycleStatus = 'rejected';
      } else {
        query.lifecycleStatus = status;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { address: regex },
        { pauseReason: regex }
      ];
    }

    const history = await MilkPauseRequest.find(query)
      .populate('userId', 'name phone walletBalance')
      .populate('reviewedBy', 'name phone role')
      .sort({ requestedAt: -1 })
      .limit(500);

    // Summary statistics for the audit ledger
    const totalPauses = await MilkPauseRequest.countDocuments();
    const activePauses = await MilkPauseRequest.countDocuments({ lifecycleStatus: { $in: ['active_pause', 'extended'] } });
    const resumedPauses = await MilkPauseRequest.countDocuments({ lifecycleStatus: 'resumed' });
    const autoApproved = await MilkPauseRequest.countDocuments({ approvalStatus: 'auto_approved' });
    const pendingReview = await MilkPauseRequest.countDocuments({ lifecycleStatus: 'pending_review' });
    const rejectedPauses = await MilkPauseRequest.countDocuments({ lifecycleStatus: 'rejected' });

    res.json({
      success: true,
      summary: {
        totalPauses,
        activePauses,
        resumedPauses,
        autoApproved,
        pendingReview,
        rejectedPauses
      },
      history
    });
  } catch (error) {
    console.error('Admin Pause History Error:', error);
    res.status(500).json({ error: 'Failed to fetch pause history audit ledger.' });
  }
});

// @route   GET /api/milk/admin/cancellations
// @desc    List all cancelled/pending cancellation milk subscriptions
// @access  Private/Admin
router.get('/admin/cancellations', protect, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {
      $or: [
        { cancellationStatus: { $in: ['pending_approval', 'approved', 'rejected'] } },
        { status: 'cancelled' }
      ]
    };

    if (status && status !== 'all') {
      if (status === 'pending') {
        query = { cancellationStatus: 'pending_approval' };
      } else if (status === 'approved') {
        query = {
          $or: [
            { cancellationStatus: 'approved' },
            { status: 'cancelled', cancellationStatus: { $ne: 'pending_approval' } }
          ]
        };
      } else if (status === 'rejected') {
        query = { cancellationStatus: 'rejected' };
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $and: [
          query,
          {
            $or: [
              { name: regex },
              { phone: regex },
              { address: regex },
              { cancellationReason: regex }
            ]
          }
        ]
      };
    }

    const cancelledSubs = await MilkSubscription.find(query)
      .populate('userId', 'name phone walletBalance')
      .sort({ cancellationRequestedAt: -1, cancelledAt: -1, updatedAt: -1 });

    const pendingCount = await MilkSubscription.countDocuments({ cancellationStatus: 'pending_approval' });
    const approvedCount = await MilkSubscription.countDocuments({
      $or: [
        { cancellationStatus: 'approved' },
        { status: 'cancelled', cancellationStatus: { $ne: 'pending_approval' } }
      ]
    });
    const rejectedCount = await MilkSubscription.countDocuments({ cancellationStatus: 'rejected' });

    res.json({
      success: true,
      summary: {
        total: cancelledSubs.length,
        pendingCount,
        approvedCount,
        rejectedCount
      },
      subscriptions: cancelledSubs
    });
  } catch (error) {
    console.error('Admin Cancellations Error:', error);
    res.status(500).json({ error: 'Failed to fetch cancelled subscriptions.' });
  }
});

// @route   PUT /api/milk/admin/subscriptions/:id/review-cancellation
// @desc    Admin review cancellation request (Approve / Reject)
// @access  Private/Admin
router.put('/admin/subscriptions/:id/review-cancellation', protect, async (req, res) => {
  try {
    const { action, adminRemarks } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approved" or "rejected".' });
    }

    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    if (action === 'approved') {
      sub.status = 'cancelled';
      sub.cancellationStatus = 'approved';
      sub.cancelledAt = new Date();
      sub.cancellationAdminRemarks = adminRemarks || 'Cancellation approved by admin';
    } else {
      sub.cancellationStatus = 'rejected';
      sub.cancellationAdminRemarks = adminRemarks || 'Cancellation rejected by admin';
      if (sub.status === 'cancelled') {
        sub.status = 'approved';
      }
    }

    await sub.save();

    notifyRealtime({
      action: 'cancellation_reviewed',
      cancellationStatus: sub.cancellationStatus,
      status: sub.status,
      subscription: sub,
      message: action === 'approved'
        ? `Milk service cancellation for ${sub.name} has been approved.`
        : `Milk service cancellation for ${sub.name} has been rejected.`
    }, sub.userId);

    sendNotification(sub.userId, {
      title: action === 'approved' ? 'दूध सेवा रद्दीकरण स्वीकृत' : 'दूध सेवा रद्दीकरण अस्वीकृत',
      messageHi: action === 'approved'
        ? 'आपकी दूध सेवा रद्द करने का अनुरोध स्वीकृत कर दिया गया है। अब आप नया आवेदन कर सकते हैं।'
        : `दूध सेवा रद्दीकरण अनुरोध अस्वीकृत: ${adminRemarks || 'एडमिन द्वारा अस्वीकृत'}`,
      messageEn: action === 'approved'
        ? 'Your milk subscription cancellation request has been approved.'
        : `Milk cancellation request rejected: ${adminRemarks || 'Rejected by Admin'}`,
      type: 'milk_subscription',
      refId: String(sub._id),
      data: { subscriptionId: String(sub._id), type: 'milk_subscription', screen: '/milk' }
    }).catch(err => console.error('[Milk Notification Error - Cancellation Review]:', err));

    res.json({
      success: true,
      message: `Cancellation request has been ${action}.`,
      subscription: sub
    });
  } catch (error) {
    console.error('Admin Review Cancellation Error:', error);
    res.status(500).json({ error: 'Failed to review cancellation request.' });
  }
});

// @route   PUT /api/milk/admin/subscriptions/:id/reactivate
// @desc    Reactivate a cancelled subscription back to approved
// @access  Private/Admin
router.put('/admin/subscriptions/:id/reactivate', protect, async (req, res) => {
  try {
    const sub = await MilkSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

    sub.status = 'approved';
    sub.cancellationStatus = 'none';
    sub.cancelledAt = null;
    sub.cancellationReason = '';
    sub.cancellationAgreementAccepted = false;
    sub.adminRemarks = req.body.adminRemarks || 'Reactivated by Admin';
    await sub.save();

    notifyRealtime({
      action: 'service_reactivated',
      subscription: sub,
      message: 'Cancelled milk subscription reactivated by Admin'
    }, sub.userId);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully.',
      subscription: sub
    });
  } catch (error) {
    console.error('Reactivate Subscription Error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription.' });
  }
});

// @route   GET /api/milk/admin/config
// @desc    Get global milk configuration (withdrawal days, default rates, shift windows)
// @access  Private/Admin
router.get('/admin/config', protect, async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get Config Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk configuration.' });
  }
});

// @route   PUT /api/milk/admin/config
// @desc    Update global milk configuration with advance pause hours and auto-approval threshold
// @access  Private/Admin
router.put('/admin/config', protect, async (req, res) => {
  try {
    const {
      withdrawalCycleDays,
      defaultSellRate,
      defaultBuyRate,
      cancellationAgreementText,
      morningShiftWindow,
      eveningShiftWindow,
      minAdvancePauseDays,
      minAdvancePauseHours,
      maxAutoApprovePauseDays,
      minPartnerWalletBalance,
      adminCommissionPercent
    } = req.body;

    const config = await getOrCreateConfig();

    if (withdrawalCycleDays !== undefined) config.withdrawalCycleDays = Number(withdrawalCycleDays);
    if (defaultSellRate !== undefined) config.defaultSellRate = Number(defaultSellRate);
    if (defaultBuyRate !== undefined) config.defaultBuyRate = Number(defaultBuyRate);
    if (cancellationAgreementText !== undefined) config.cancellationAgreementText = cancellationAgreementText;
    if (morningShiftWindow !== undefined) config.morningShiftWindow = morningShiftWindow;
    if (eveningShiftWindow !== undefined) config.eveningShiftWindow = eveningShiftWindow;
    if (minPartnerWalletBalance !== undefined) config.minPartnerWalletBalance = Math.max(0, Number(minPartnerWalletBalance));
    if (adminCommissionPercent !== undefined) config.adminCommissionPercent = Math.min(100, Math.max(0, Number(adminCommissionPercent)));

    // Advance notice settings in hours & days
    if (minAdvancePauseHours !== undefined) {
      config.minAdvancePauseHours = Number(minAdvancePauseHours);
      config.minAdvancePauseDays = Math.ceil(Number(minAdvancePauseHours) / 24);
    } else if (minAdvancePauseDays !== undefined) {
      config.minAdvancePauseDays = Number(minAdvancePauseDays);
      config.minAdvancePauseHours = Number(minAdvancePauseDays) * 24;
    }

    if (maxAutoApprovePauseDays !== undefined) {
      config.maxAutoApprovePauseDays = Number(maxAutoApprovePauseDays);
    }

    config.updatedBy = req.user.id;

    await config.save();

    notifyRealtime({
      action: 'config_updated',
      config,
      message: 'Milk service governance & pause settings updated'
    });

    res.json({
      success: true,
      message: 'Milk configuration updated successfully.',
      config
    });
  } catch (error) {
    console.error('Update Config Error:', error);
    res.status(500).json({ error: 'Failed to update configuration.' });
  }
});

// @route   GET /api/milk/admin/stats
// @desc    Get dashboard metrics for Milk Services
// @access  Private/Admin
router.get('/admin/stats', protect, async (req, res) => {
  try {
    const totalSellers = await MilkSubscription.countDocuments({ type: 'sell', status: 'approved' });
    const totalBuyers = await MilkSubscription.countDocuments({ type: 'buy', status: 'approved' });
    const pendingRequests = await MilkSubscription.countDocuments({ status: 'pending' });
    const pausedCount = await MilkSubscription.countDocuments({ status: 'paused' });
    const cancelledCount = await MilkSubscription.countDocuments({ status: 'cancelled' });
    const pendingCancellations = await MilkSubscription.countDocuments({ cancellationStatus: 'pending_approval' });
    const pendingShiftChanges = await MilkSubscription.countDocuments({ shiftChangeStatus: 'pending_approval' });
    const activePartners = await User.countDocuments({ role: 'milk_partner', status: 'approved' });
    const pendingPartners = await User.countDocuments({ role: 'milk_partner', status: 'pending' });

    // Today's total volume
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayLogs = await MilkDailyLog.find({
      date: { $gte: startOfToday },
      status: 'Completed'
    });

    const todayCollectedLiters = todayLogs
      .filter(l => l.type === 'sell')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    const todayDeliveredLiters = todayLogs
      .filter(l => l.type === 'buy')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    res.json({
      success: true,
      stats: {
        totalSellers,
        totalBuyers,
        pendingRequests,
        pausedCount,
        cancelledCount,
        pendingCancellations,
        pendingShiftChanges,
        activePartners,
        pendingPartners,
        todayCollectedLiters: Math.round(todayCollectedLiters * 10) / 10,
        todayDeliveredLiters: Math.round(todayDeliveredLiters * 10) / 10
      }
    });
  } catch (error) {
    console.error('Milk Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk stats.' });
  }
});

// ----------------------------------------------------
// MILK PARTNER ENDPOINTS
// ----------------------------------------------------

// Helper to normalize phone
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let clean = String(rawPhone).replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.substring(2);
  } else if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.substring(1);
  }
  return clean;
}

// @route   POST /api/milk/partner/register
// @desc    Register a new Milk Partner (Pending admin approval)
// @access  Public
router.post('/partner/register', async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      assignedRoute,
      vehicleType,
      vehicleNumber,
      canisterCapacityLiters,
      hasTestingKit,
      bankDetails
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Name, phone, and address are required.' });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    const phoneRegex = new RegExp(`${cleanPhone}$`);
    let existingUser = await User.findOne({ phone: { $regex: phoneRegex }, role: 'milk_partner' });

    if (existingUser && existingUser.status === 'approved') {
      return res.status(400).json({
        error: 'An approved Milk Partner account already exists with this phone number. Please login.'
      });
    }

    if (existingUser) {
      // Update pending record
      existingUser.name = name.trim();
      existingUser.address = address.trim();
      if (email) existingUser.email = email.trim();
      if (assignedRoute) existingUser.assignedRoute = assignedRoute.trim();
      if (vehicleType) existingUser.vehicleType = vehicleType;
      if (vehicleNumber) existingUser.vehicleNumber = vehicleNumber.trim();
      if (canisterCapacityLiters) existingUser.canisterCapacityLiters = Number(canisterCapacityLiters);
      existingUser.hasTestingKit = Boolean(hasTestingKit);
      if (bankDetails) existingUser.bankDetails = { ...existingUser.bankDetails, ...bankDetails };
      existingUser.status = 'pending';
      await existingUser.save();

      notifyRealtime({ type: 'partner_registered', partnerId: existingUser._id });
      return res.json({
        success: true,
        message: 'Your registration has been updated and is under admin review.',
        user: existingUser
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : undefined,
      address: address.trim(),
      role: 'milk_partner',
      status: 'pending',
      assignedRoute: assignedRoute ? assignedRoute.trim() : '',
      vehicleType: vehicleType || 'Motorcycle',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim() : '',
      canisterCapacityLiters: Number(canisterCapacityLiters) || 0,
      hasTestingKit: Boolean(hasTestingKit),
      bankDetails: bankDetails || {}
    });

    notifyRealtime({ type: 'partner_registered', partnerId: newUser._id });

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Awaiting admin approval.',
      user: newUser
    });
  } catch (error) {
    console.error('Partner Register Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit registration.' });
  }
});

// @route   GET /api/milk/partner/profile
// @desc    Get Milk Partner profile & approval status
// @access  Private (Partner)
router.get('/partner/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || user.role !== 'milk_partner') {
      return res.status(403).json({ error: 'Access denied: Milk Partner only.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Partner Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch partner profile.' });
  }
});

// @route   GET /api/milk/partner/dashboard
// @desc    Get Milk Partner dashboard metrics (monthly volume purchased & sold)
// @access  Private (Partner)
router.get('/partner/dashboard', protect, async (req, res) => {
  try {
    const partner = await User.findById(req.user.id);
    if (!partner || partner.role !== 'milk_partner') {
      return res.status(403).json({ error: 'Access denied: Milk Partner only.' });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Monthly completed logs across the system or performed by this partner
    const monthlyLogs = await MilkDailyLog.find({
      date: { $gte: thisMonthStart, $lte: thisMonthEnd },
      status: 'Completed'
    });

    const monthlyPurchasedLiters = monthlyLogs
      .filter(l => l.type === 'sell')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    const monthlySoldLiters = monthlyLogs
      .filter(l => l.type === 'buy')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    // Today's completed logs
    const todayLogs = await MilkDailyLog.find({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const todayCollectedLiters = todayLogs
      .filter(l => l.type === 'sell' && l.status === 'Completed')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    const todayDeliveredLiters = todayLogs
      .filter(l => l.type === 'buy' && l.status === 'Completed')
      .reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    // Total active registered subscribers count
    const totalFarmers = await MilkSubscription.countDocuments({ type: 'sell', status: 'approved' });
    const totalCustomers = await MilkSubscription.countDocuments({ type: 'buy', status: 'approved' });

    res.json({
      success: true,
      dashboard: {
        monthlyPurchasedLiters: Math.round(monthlyPurchasedLiters * 10) / 10,
        monthlySoldLiters: Math.round(monthlySoldLiters * 10) / 10,
        todayCollectedLiters: Math.round(todayCollectedLiters * 10) / 10,
        todayDeliveredLiters: Math.round(todayDeliveredLiters * 10) / 10,
        totalFarmers,
        totalCustomers,
        partner: {
          _id: partner._id,
          name: partner.name,
          phone: partner.phone,
          status: partner.status,
          assignedRoute: partner.assignedRoute || 'Main Route',
          vehicleType: partner.vehicleType || 'Motorcycle',
          vehicleNumber: partner.vehicleNumber || '',
          profilePhotoUrl: partner.profilePhotoUrl || '',
          canisterCapacityLiters: partner.canisterCapacityLiters || 0,
          hasTestingKit: partner.hasTestingKit || false
        }
      }
    });
  } catch (error) {
    console.error('Partner Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// @route   GET /api/milk/partner/collection-list
// @desc    Get dynamic list of farmers to collect milk from for date & shift
// @access  Private (Partner)
router.get('/partner/collection-list', protect, async (req, res) => {
  try {
    const partnerUser = await User.findById(req.user.id);
    if (partnerUser && partnerUser.status === 'blocked') {
      return res.status(403).json({ error: 'आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है। (Your partner account has been blocked by Admin)' });
    }

    const { date, shift } = req.query; // date: YYYY-MM-DD, shift: Morning | Evening | Both
    const targetShift = (shift === 'Evening' ? 'Evening' : 'Morning');

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Strictly active sell subscriptions assigned to this milk partner
    // Exclude cancelled or cancellation pending
    const subscriptions = await MilkSubscription.find({
      type: 'sell',
      status: 'approved',
      cancellationStatus: { $nin: ['approved', 'pending_approval'] },
      assignedPartnerId: req.user.id
    }).sort({ name: 1 });

    // Fetch logs already recorded for this day
    const logs = await MilkDailyLog.find({
      type: 'sell',
      date: { $gte: dayStart, $lte: dayEnd },
      shift: targetShift
    });

    // Exclude any customer that has an approved or active temporary pause today
    const activeSubscriptions = subscriptions.filter(sub => {
      if (sub.status === 'paused') return false;
      if (sub.pauseApprovalStatus === 'auto_approved' || sub.pauseApprovalStatus === 'approved') {
        if (sub.pauseStartDate && sub.expectedResumeDate) {
          const pStart = new Date(sub.pauseStartDate);
          pStart.setHours(0, 0, 0, 0);
          const pEnd = new Date(sub.expectedResumeDate);
          pEnd.setHours(23, 59, 59, 999);
          if (dayStart >= pStart && dayStart < pEnd) {
            const shiftMatches = !sub.pauseShift || sub.pauseShift === 'Both' || sub.pauseShift === targetShift;
            if (shiftMatches) return false; // Paused today -> exclude!
          }
        }
      }
      return true;
    });

    const list = activeSubscriptions.map(sub => {
      // Check delivery schedule matches shift
      const sched = sub.deliverySchedule || 'Morning and Evening';
      const scheduleMatches = sched.includes('Both') || sched.includes('Morning and Evening') || sched.includes(targetShift);

      const existingLog = logs.find(l => String(l.subscriptionId) === String(sub._id));

      return {
        subscriptionId: sub._id,
        userId: sub.userId,
        name: sub.name,
        phone: sub.phone,
        address: sub.address,
        landmark: sub.landmark,
        dailyQuantityLiters: sub.dailyQuantityLiters,
        deliverySchedule: sub.deliverySchedule,
        ratePerLiter: sub.ratePerLiter || 45,
        scheduleMatches,
        log: existingLog ? {
          _id: existingLog._id,
          quantityLiters: existingLog.quantityLiters,
          ratePerLiter: existingLog.ratePerLiter,
          totalAmount: existingLog.totalAmount,
          status: existingLog.status,
          fatPercentage: existingLog.fatPercentage,
          snfPercentage: existingLog.snfPercentage,
          notes: existingLog.notes
        } : null
      };
    });

    res.json({ success: true, list });
  } catch (error) {
    console.error('Collection List Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk collection list.' });
  }
});

// @route   GET /api/milk/partner/delivery-list
// @desc    Get dynamic list of customers to deliver milk to for date & shift
// @access  Private (Partner)
router.get('/partner/delivery-list', protect, async (req, res) => {
  try {
    const partnerUser = await User.findById(req.user.id);
    if (partnerUser && partnerUser.status === 'blocked') {
      return res.status(403).json({ error: 'आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है। (Your partner account has been blocked by Admin)' });
    }

    const { date, shift } = req.query;
    const targetShift = (shift === 'Evening' ? 'Evening' : 'Morning');

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Strictly active buy subscriptions assigned to this milk partner
    // Exclude cancelled or cancellation pending
    const subscriptions = await MilkSubscription.find({
      type: 'buy',
      status: 'approved',
      cancellationStatus: { $nin: ['approved', 'pending_approval'] },
      assignedPartnerId: req.user.id
    }).populate('userId', 'phone name').sort({ name: 1 });

    const logs = await MilkDailyLog.find({
      type: 'buy',
      date: { $gte: dayStart, $lte: dayEnd },
      shift: targetShift
    });

    // Exclude any customer that has an approved or active temporary pause today
    const activeSubscriptions = subscriptions.filter(sub => {
      if (sub.status === 'paused') return false;
      if (sub.pauseApprovalStatus === 'auto_approved' || sub.pauseApprovalStatus === 'approved') {
        if (sub.pauseStartDate && sub.expectedResumeDate) {
          const pStart = new Date(sub.pauseStartDate);
          pStart.setHours(0, 0, 0, 0);
          const pEnd = new Date(sub.expectedResumeDate);
          pEnd.setHours(23, 59, 59, 999);
          if (dayStart >= pStart && dayStart < pEnd) {
            const shiftMatches = !sub.pauseShift || sub.pauseShift === 'Both' || sub.pauseShift === targetShift;
            if (shiftMatches) return false; // Paused today -> exclude!
          }
        }
      }
      return true;
    });

    const list = activeSubscriptions.map(sub => {
      const sched = sub.deliverySchedule || 'Morning and Evening';
      const scheduleMatches = sched.includes('Both') || sched.includes('Morning and Evening') || sched.includes(targetShift);

      const existingLog = logs.find(l => String(l.subscriptionId) === String(sub._id));
      const userObj = sub.userId || {};

      return {
        subscriptionId: sub._id,
        userId: userObj._id || sub.userId,
        name: sub.name,
        phone: sub.phone,
        address: sub.address,
        landmark: sub.landmark,
        dailyQuantityLiters: sub.dailyQuantityLiters,
        deliverySchedule: sub.deliverySchedule,
        ratePerLiter: sub.ratePerLiter || 60,
        scheduleMatches,
        log: existingLog ? {
          _id: existingLog._id,
          quantityLiters: existingLog.quantityLiters,
          ratePerLiter: existingLog.ratePerLiter,
          totalAmount: existingLog.totalAmount,
          status: existingLog.status,
          notes: existingLog.notes
        } : null
      };
    });

    const config = await getOrCreateConfig();
    const adminCommissionPercent = config.adminCommissionPercent !== undefined ? config.adminCommissionPercent : 10;

    res.json({ success: true, list, adminCommissionPercent });
  } catch (error) {
    console.error('Delivery List Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk delivery list.' });
  }
});

// @route   POST /api/milk/partner/record-collection
// @desc    Record milk collection from farmer, credit farmer accumulated balance
// @access  Private (Partner)
router.post('/partner/record-collection', protect, async (req, res) => {
  try {
    const {
      subscriptionId,
      date,
      shift,
      actualQuantityLiters,
      ratePerLiter,
      fatPercentage,
      snfPercentage,
      notes
    } = req.body;

    if (!subscriptionId || !actualQuantityLiters || Number(actualQuantityLiters) <= 0) {
      return res.status(400).json({ error: 'Valid subscription and quantity in liters are required.' });
    }

    const sub = await MilkSubscription.findById(subscriptionId);
    if (!sub || sub.type !== 'sell') {
      return res.status(404).json({ error: 'Sell milk subscription not found.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    const targetShift = (shift === 'Evening' ? 'Evening' : 'Morning');

    const qty = Number(actualQuantityLiters);
    // Use partner's custom rate (if specified and valid) based on FAT/SNF quality, else default to subscriber base rate
    const rate = (ratePerLiter !== undefined && Number(ratePerLiter) > 0)
      ? Math.round(Number(ratePerLiter) * 100) / 100
      : (sub.ratePerLiter || 45);
    const amount = Math.round(qty * rate * 100) / 100;

    let log = await MilkDailyLog.findOne({
      subscriptionId: sub._id,
      date: { $gte: dayStart, $lte: dayEnd },
      shift: targetShift
    });

    let deltaAmount = amount;
    if (log) {
      deltaAmount = amount - (log.totalAmount || 0);
    }

    // Check Milk Partner's wallet balance
    const partner = await User.findById(req.user.id);
    if (!partner) {
      return res.status(404).json({ error: 'Milk partner not found.' });
    }

    if (partner.status === 'blocked') {
      return res.status(403).json({ error: 'आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है। (Your partner account has been blocked by Admin)' });
    }

    const config = await getOrCreateConfig();
    const minBalance = config.minPartnerWalletBalance !== undefined ? config.minPartnerWalletBalance : 500;

    // Check 1: Minimum wallet balance required to purchase milk
    if ((partner.walletBalance || 0) < minBalance) {
      return res.status(400).json({
        error: `दूध खरीद हेतु आपके वॉलेट में न्यूनतम ₹${minBalance} होना अनिवार्य है। वर्तमान बैलेंस: ₹${partner.walletBalance || 0}। कृपया पहले वॉलेट रिचार्ज करें।`,
        requiredBalance: minBalance,
        currentBalance: partner.walletBalance || 0
      });
    }

    // Check 2: Sufficient balance for this purchase transaction
    if (deltaAmount > 0 && (partner.walletBalance || 0) < deltaAmount) {
      return res.status(400).json({
        error: `दूध खरीद हेतु अपर्याप्त वॉलेट बैलेंस। आवश्यक राशि: ₹${deltaAmount}, उपलब्ध बैलेंस: ₹${partner.walletBalance || 0}। कृपया पहले वॉलेट रिचार्ज करें।`,
        requiredAmount: deltaAmount,
        currentBalance: partner.walletBalance || 0
      });
    }

    if (log) {
      log.quantityLiters = qty;
      log.ratePerLiter = rate;
      log.totalAmount = amount;
      log.fatPercentage = fatPercentage ? Number(fatPercentage) : null;
      log.snfPercentage = snfPercentage ? Number(snfPercentage) : null;
      log.notes = notes || log.notes || '';
      log.performedBy = req.user.id;
      log.status = 'Completed';
      await log.save();
    } else {
      log = await MilkDailyLog.create({
        subscriptionId: sub._id,
        userId: sub.userId,
        type: 'sell',
        date: targetDate,
        shift: targetShift,
        quantityLiters: qty,
        ratePerLiter: rate,
        totalAmount: amount,
        fatPercentage: fatPercentage ? Number(fatPercentage) : null,
        snfPercentage: snfPercentage ? Number(snfPercentage) : null,
        notes: notes || '',
        performedBy: req.user.id,
        status: 'Completed'
      });
    }

    // Deduct purchase amount from Milk Partner's wallet and credit Farmer's cycle accumulated amount
    if (deltaAmount !== 0) {
      partner.walletBalance = Math.round(((partner.walletBalance || 0) - deltaAmount) * 100) / 100;
      await partner.save();

      try {
        await Transaction.create({
          transactionId: 'PUR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          recipient: partner._id,
          referenceId: log._id,
          module: 'Milk',
          amount: Math.abs(deltaAmount),
          type: deltaAmount > 0 ? 'Debit' : 'Credit',
          paymentMode: 'NexCard Wallet',
          status: 'Completed',
          note: `Milk Purchase Payment: ${qty} L @ ₹${rate}/L (Farmer: ${sub.name})`
        });
      } catch (txErr) {
        console.warn('Purchase transaction logging skipped:', txErr.message);
      }

      const farmer = await User.findById(sub.userId);
      if (farmer) {
        if (!farmer.milkCycleStartDate || new Date(farmer.milkCycleStartDate).getTime() > dayStart.getTime()) {
          farmer.milkCycleStartDate = dayStart;
        }
        farmer.milkCycleAccumulatedAmount = Math.max(0, (farmer.milkCycleAccumulatedAmount || 0) + deltaAmount);
        await farmer.save();
      }
    }

    notifyRealtime({
      type: 'milk_collected',
      subscriptionId: sub._id,
      farmerId: sub.userId,
      liters: qty,
      amount
    }, sub.userId);

    res.json({
      success: true,
      message: `Successfully recorded collection of ${qty} L (₹${amount}).`,
      log
    });
  } catch (error) {
    console.error('Record Collection Error:', error);
    res.status(500).json({ error: error.message || 'Failed to record collection.' });
  }
});

// @route   POST /api/milk/partner/record-delivery
// @desc    Record milk delivery to customer, debit customer milk wallet
// @access  Private (Partner)
router.post('/partner/record-delivery', protect, async (req, res) => {
  try {
    const partnerUser = await User.findById(req.user.id);
    if (!partnerUser) return res.status(404).json({ error: 'Milk partner not found.' });
    if (partnerUser.status === 'blocked') {
      return res.status(403).json({ error: 'आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है। (Your partner account has been blocked by Admin)' });
    }

    const {
      subscriptionId,
      date,
      shift,
      actualQuantityLiters,
      deliveryStatus, // 'Completed' | 'Skipped'
      notes
    } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required.' });
    }

    const sub = await MilkSubscription.findById(subscriptionId);
    if (!sub || sub.type !== 'buy') {
      return res.status(404).json({ error: 'Buy milk subscription not found.' });
    }

    const isSkipped = deliveryStatus === 'Skipped';
    const qty = isSkipped ? 0 : Number(actualQuantityLiters);
    if (!isSkipped && (isNaN(qty) || qty <= 0)) {
      return res.status(400).json({ error: 'Valid quantity in liters is required.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    const targetShift = (shift === 'Evening' ? 'Evening' : 'Morning');

    const rate = sub.ratePerLiter || 60;
    const amount = isSkipped ? 0 : Math.round(qty * rate * 100) / 100;

    let log = await MilkDailyLog.findOne({
      subscriptionId: sub._id,
      date: { $gte: dayStart, $lte: dayEnd },
      shift: targetShift
    });

    let deltaAmount = amount;
    if (log) {
      deltaAmount = amount - (log.totalAmount || 0);
    }

    // Check Buyer Wallet Balance: If wallet is insufficient for delivery, block partner and notify buyer
    const buyer = await User.findById(sub.userId);
    if (!isSkipped && deltaAmount > 0 && buyer) {
      const currentBuyerBalance = Number(buyer.walletBalance || 0);
      if (currentBuyerBalance < deltaAmount) {
        // Send In-App & FCM Push Notification to the buyer
        sendNotification(buyer._id, {
          title: 'वॉलेट रिचार्ज आवश्यक (Wallet Recharge Required)',
          messageHi: `दूध डिलीवरी राशि ₹${deltaAmount} के लिए आपका वॉलेट बैलेंस (₹${currentBuyerBalance}) अपर्याप्त है। कृपया निर्बाध सेवा हेतु तुरंत अपना वॉलेट रिचार्ज करें।`,
          messageEn: `Insufficient wallet balance (₹${currentBuyerBalance}) for milk delivery of ₹${deltaAmount}. Please recharge your wallet to continue service.`,
          type: 'wallet_alert',
          refId: String(sub._id),
          data: { type: 'wallet', screen: '/wallet' }
        }).catch(err => console.error('[Milk Notification Error - Low Wallet]:', err));

        return res.status(400).json({
          insufficientWallet: true,
          error: `ग्राहक (${buyer.name}) के वॉलेट में अपर्याप्त बैलेंस है। आवश्यक राशि: ₹${deltaAmount}, उपलब्ध बैलेंस: ₹${currentBuyerBalance}। कृपया ग्राहक से पहले वॉलेट रिचार्ज करने को कहें।`,
          requiredAmount: deltaAmount,
          currentBalance: currentBuyerBalance,
          buyerName: buyer.name
        });
      }
    }

    if (log) {
      log.quantityLiters = qty;
      log.ratePerLiter = rate;
      log.totalAmount = amount;
      log.status = isSkipped ? 'Skipped' : 'Completed';
      log.notes = notes || log.notes || '';
      log.performedBy = req.user.id;
      await log.save();
    } else {
      log = await MilkDailyLog.create({
        subscriptionId: sub._id,
        userId: sub.userId,
        type: 'buy',
        date: targetDate,
        shift: targetShift,
        quantityLiters: qty,
        ratePerLiter: rate,
        totalAmount: amount,
        status: isSkipped ? 'Skipped' : 'Completed',
        notes: notes || '',
        performedBy: req.user.id
      });
    }

    // Debit buyer wallet
    if (deltaAmount !== 0) {
      const buyer = await User.findById(sub.userId);
      if (buyer) {
        buyer.walletBalance = (buyer.walletBalance || 0) - deltaAmount;
        await buyer.save();

        if (deltaAmount > 0) {
          try {
            await Transaction.create({
              transactionId: 'MLK_DR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              recipient: buyer._id,
              module: 'Milk',
              amount: deltaAmount,
              type: 'Debit',
              paymentMode: 'NexCard Wallet',
              status: 'Completed',
              performedBy: req.user.id,
              note: `Milk Delivery: ${qty} L (${targetShift})`
            });
          } catch (te) {
            console.warn('Buyer delivery transaction logging skipped:', te.message);
          }
        }
      }
    }

    // Immediately calculate Admin Commission % and credit remainder to Milk Partner's wallet
    let partnerEarning = 0;
    let adminCutAmount = 0;
    let adminPercent = 10;
    if (!isSkipped && qty > 0) {
      const config = await getOrCreateConfig();
      adminPercent = config.adminCommissionPercent !== undefined ? config.adminCommissionPercent : 10;
      adminCutAmount = Math.round((amount * (adminPercent / 100)) * 100) / 100;
      partnerEarning = Math.round((amount - adminCutAmount) * 100) / 100;

      log.adminCommissionPercent = adminPercent;
      log.adminCutAmount = adminCutAmount;
      log.partnerEarning = partnerEarning;
      await log.save();

      if (partnerEarning > 0) {
        const partner = await User.findById(req.user.id);
        if (partner) {
          // Check if transaction already exists for this daily log
          let existingTx = await Transaction.findOne({
            recipient: partner._id,
            module: 'Milk',
            referenceId: log._id
          });

          let deltaPartnerEarning = partnerEarning;
          if (existingTx) {
            deltaPartnerEarning = Math.round((partnerEarning - (existingTx.amount || 0)) * 100) / 100;
          }

          if (deltaPartnerEarning !== 0) {
            partner.walletBalance = Math.round(((partner.walletBalance || 0) + deltaPartnerEarning) * 100) / 100;
            await partner.save();
          }

          const customerName = sub.name || 'Customer';
          const txNote = `Milk Sale Proceeds: ${qty} L @ ₹${rate}/L (Customer: ${customerName}, Gross ₹${amount} less ${adminPercent}% Platform Fee ₹${adminCutAmount})`;

          try {
            if (existingTx) {
              existingTx.amount = partnerEarning;
              existingTx.note = txNote;
              await existingTx.save();
            } else {
              await Transaction.create({
                transactionId: 'SL_CR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                recipient: partner._id,
                referenceId: log._id,
                module: 'Milk',
                amount: partnerEarning,
                type: 'Credit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                note: txNote
              });
            }
          } catch (comErr) {
            console.warn('Partner sale earnings transaction logging skipped:', comErr.message);
          }
        }
      }

      if (adminCutAmount > 0) {
        try {
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            await Transaction.create({
              transactionId: 'ADM_CUT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              recipient: adminUser._id,
              module: 'Milk',
              amount: adminCutAmount,
              type: 'Credit',
              paymentMode: 'NexCard Wallet',
              status: 'Completed',
              note: `Platform Fee (${adminPercent}%) on ${qty} L Milk Sale to ${sub.name}`
            });
          }
        } catch (admTxErr) {
          console.warn('Admin platform fee transaction skipped:', admTxErr.message);
        }
      }
    }

    notifyRealtime({
      type: 'milk_delivered',
      subscriptionId: sub._id,
      buyerId: sub.userId,
      liters: qty,
      amount,
      partnerEarning,
      adminCutAmount,
      status: log.status
    }, sub.userId);

    res.json({
      success: true,
      message: isSkipped
        ? 'Delivery marked as Skipped.'
        : `Successfully delivered ${qty} L (₹${amount}). ₹${partnerEarning} credited to your wallet (${adminPercent}% Platform Fee: ₹${adminCutAmount})!`,
      partnerEarning,
      adminCutAmount,
      log
    });
  } catch (error) {
    console.error('Record Delivery Error:', error);
    res.status(500).json({ error: error.message || 'Failed to record delivery.' });
  }
});

// @route   PUT /api/milk/partner/logs/:id
// @desc    Dynamically edit an existing daily log (correction/update)
// @access  Private (Partner)
router.put('/partner/logs/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { actualQuantityLiters, ratePerLiter, fatPercentage, snfPercentage, notes } = req.body;

    const log = await MilkDailyLog.findById(id);
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found.' });
    }

    const newQty = Number(actualQuantityLiters);
    if (isNaN(newQty) || newQty <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required.' });
    }

    const newRate = (ratePerLiter !== undefined && Number(ratePerLiter) > 0)
      ? Math.round(Number(ratePerLiter) * 100) / 100
      : log.ratePerLiter;

    const newAmount = Math.round(newQty * newRate * 100) / 100;
    const delta = newAmount - log.totalAmount;

    log.quantityLiters = newQty;
    log.ratePerLiter = newRate;
    log.totalAmount = newAmount;
    if (fatPercentage !== undefined) log.fatPercentage = Number(fatPercentage);
    if (snfPercentage !== undefined) log.snfPercentage = Number(snfPercentage);
    if (notes !== undefined) log.notes = notes;
    await log.save();

    // Adjust wallet delta
    if (delta !== 0) {
      const user = await User.findById(log.userId);
      if (user) {
        if (log.type === 'sell') {
          user.milkCycleAccumulatedAmount = Math.max(0, (user.milkCycleAccumulatedAmount || 0) + delta);
          user.walletBalance = (user.walletBalance || 0) + delta;
        } else {
          user.walletBalance = (user.walletBalance || 0) - delta;
        }
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Log updated successfully.',
      log
    });
  } catch (error) {
    console.error('Update Log Error:', error);
    res.status(500).json({ error: error.message || 'Failed to update log.' });
  }
});

// @route   GET /api/milk/partner/history
// @desc    Get complete purchase and sales history with filters for milk partner
// @access  Private (Partner)
router.get('/partner/history', protect, async (req, res) => {
  try {
    const { type, shift, startDate, endDate, search } = req.query;
    let query = { performedBy: req.user.id };

    if (type && type !== 'all') {
      query.type = type; // 'sell' (Purchase) or 'buy' (Sales)
    }

    if (shift && shift !== 'all') {
      query.shift = shift;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    let logs = await MilkDailyLog.find(query)
      .populate('subscriptionId', 'name phone address landmark dailyQuantityLiters ratePerLiter type')
      .populate('userId', 'name phone')
      .sort({ date: -1, createdAt: -1 })
      .limit(200);

    // Apply search filter if provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(l => {
        const sub = l.subscriptionId || {};
        const u = l.userId || {};
        return (
          (sub.name || '').toLowerCase().includes(q) ||
          (sub.phone || '').toLowerCase().includes(q) ||
          (sub.address || '').toLowerCase().includes(q) ||
          (u.name || '').toLowerCase().includes(q) ||
          (l.notes || '').toLowerCase().includes(q)
        );
      });
    }

    const config = await getOrCreateConfig();
    const adminPercent = config.adminCommissionPercent !== undefined ? config.adminCommissionPercent : 10;

    // Calculate summary statistics
    let totalCollectedLiters = 0;
    let totalDeliveredLiters = 0;
    let totalCollectionPayout = 0;
    let totalDeliveryValue = 0;
    let totalPlatformFee = 0;
    let totalPartnerSalesEarnings = 0;

    const enrichedLogs = logs.map(l => {
      const obj = l.toObject ? l.toObject() : { ...l };
      if (obj.type === 'buy' && obj.status === 'Completed') {
        const feeRate = (obj.adminCommissionPercent !== undefined && obj.adminCommissionPercent !== null)
          ? obj.adminCommissionPercent
          : adminPercent;
        const fee = (obj.adminCutAmount !== undefined && obj.adminCutAmount !== null && obj.adminCutAmount > 0)
          ? obj.adminCutAmount
          : Math.round(((obj.totalAmount || 0) * (feeRate / 100)) * 100) / 100;
        const earning = (obj.partnerEarning !== undefined && obj.partnerEarning !== null && obj.partnerEarning > 0)
          ? obj.partnerEarning
          : Math.round(((obj.totalAmount || 0) - fee) * 100) / 100;

        obj.adminCommissionPercent = feeRate;
        obj.adminCutAmount = fee;
        obj.partnerEarning = earning;
      }
      return obj;
    });

    enrichedLogs.forEach(l => {
      if (l.type === 'sell' && l.status === 'Completed') {
        totalCollectedLiters += (l.quantityLiters || 0);
        totalCollectionPayout += (l.totalAmount || 0);
      } else if (l.type === 'buy' && l.status === 'Completed') {
        totalDeliveredLiters += (l.quantityLiters || 0);
        totalDeliveryValue += (l.totalAmount || 0);
        totalPlatformFee += (l.adminCutAmount || 0);
        totalPartnerSalesEarnings += (l.partnerEarning || 0);
      }
    });

    res.json({
      success: true,
      logs: enrichedLogs,
      adminCommissionPercent: adminPercent,
      summary: {
        totalLogs: logs.length,
        totalCollectedLiters: Math.round(totalCollectedLiters * 10) / 10,
        totalDeliveredLiters: Math.round(totalDeliveredLiters * 10) / 10,
        totalCollectionPayout: Math.round(totalCollectionPayout * 100) / 100,
        totalDeliveryValue: Math.round(totalDeliveryValue * 100) / 100,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        totalPartnerSalesEarnings: Math.round(totalPartnerSalesEarnings * 100) / 100,
      }
    });
  } catch (error) {
    console.error('Partner History Error:', error);
    res.status(500).json({ error: 'Failed to fetch milk history.' });
  }
});

// @route   GET /api/milk/partner/wallet
// @desc    Get milk partner wallet balance, earnings, and transaction history
// @access  Private (Partner)
router.get('/partner/wallet', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'name phone walletBalance milkCycleAccumulatedAmount creditLimit creditUsed bankDetails upiId'
    );
    if (!user) return res.status(404).json({ error: 'Partner not found.' });

    // Fetch transactions (exclude internal admin platform fee transactions)
    const transactions = await Transaction.find({
      $or: [
        { recipient: user._id },
        { sender: user._id }
      ],
      transactionId: { $not: /^ADM_CUT_/ }
    }).sort({ createdAt: -1 }).limit(50);

    // Calculate lifetime stats from completed logs performed by this partner
    const logs = await MilkDailyLog.find({ performedBy: user._id, status: 'Completed' });
    const totalCollectedLiters = logs.filter(l => l.type === 'sell').reduce((sum, l) => sum + (l.quantityLiters || 0), 0);
    const totalDeliveredLiters = logs.filter(l => l.type === 'buy').reduce((sum, l) => sum + (l.quantityLiters || 0), 0);

    const config = await getOrCreateConfig();

    res.json({
      success: true,
      walletBalance: user.walletBalance || 0,
      adminCommissionPercent: config.adminCommissionPercent !== undefined ? config.adminCommissionPercent : 10,
      accumulatedAmount: user.milkCycleAccumulatedAmount || 0,
      minPartnerWalletBalance: config.minPartnerWalletBalance !== undefined ? config.minPartnerWalletBalance : 500,
      bankDetails: user.bankDetails || null,
      upiId: user.upiId || '',
      transactions,
      stats: {
        totalCollectedLiters: Math.round(totalCollectedLiters * 10) / 10,
        totalDeliveredLiters: Math.round(totalDeliveredLiters * 10) / 10,
        totalTransactionsCount: transactions.length
      }
    });
  } catch (error) {
    console.error('Partner Wallet Error:', error);
    res.status(500).json({ error: 'Failed to fetch partner wallet.' });
  }
});

// @route   POST /api/milk/partner/wallet/withdraw
// @desc    Request withdrawal of earnings from wallet
// @access  Private (Partner)
router.post('/partner/wallet/withdraw', protect, async (req, res) => {
  try {
    const { amount, paymentMode, upiId, bankAccountNumber, ifscCode, accountHolderName } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentBalance = user.walletBalance || 0;
    if (withdrawAmount > currentBalance) {
      return res.status(400).json({ error: `Insufficient wallet balance. Available: ₹${currentBalance}` });
    }

    // Deduct from wallet atomically
    user.walletBalance = currentBalance - withdrawAmount;
    if (upiId) user.upiId = upiId.trim();
    if (bankAccountNumber) {
      user.bankDetails = {
        accountNumber: bankAccountNumber.trim(),
        ifscCode: (ifscCode || '').trim(),
        holderName: (accountHolderName || user.name).trim()
      };
    }
    await user.save();

    // Create a pending payout transaction
    const tx = await Transaction.create({
      transactionId: 'WTH_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      recipient: user._id,
      module: 'Milk',
      amount: withdrawAmount,
      type: 'Payout',
      paymentMode: paymentMode === 'BANK' ? 'Bank Transfer' : 'UPI',
      status: 'Pending',
      note: `Milk partner withdrawal request (${paymentMode === 'BANK' ? 'Bank' : 'UPI'}: ${upiId || bankAccountNumber || 'N/A'})`
    });

    notifyRealtime({
      type: 'withdrawal_requested',
      partnerId: user._id,
      amount: withdrawAmount,
      transactionId: tx.transactionId,
      message: `Milk partner ${user.name} requested withdrawal of ₹${withdrawAmount}`
    });

    res.json({
      success: true,
      message: `Withdrawal request of ₹${withdrawAmount} submitted successfully. Payout will be processed shortly.`,
      newBalance: user.walletBalance,
      transaction: tx
    });
  } catch (error) {
    console.error('Partner Withdraw Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit withdrawal request.' });
  }
});

module.exports = router;


