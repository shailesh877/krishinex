import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, IMAGE_BASE_URL } from '../../services/api';
import { useI18n } from '@/context/I18nContext';
import { showAlert } from '@/components/CustomAlert';

export default function MilkSellHistoryScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [subscription, setSubscription] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [cycleData, setCycleData] = useState<any>(null);
  const [mainWalletBalance, setMainWalletBalance] = useState<number>(0);

  // Settings / Rules Config State
  const [minAdvanceDays, setMinAdvanceDays] = useState(1);
  const [maxAutoApproveDays, setMaxAutoApproveDays] = useState(7);

  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [startDateObj, setStartDateObj] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [resumeDateObj, setResumeDateObj] = useState<Date | null>(null);
  const [pauseShift, setPauseShift] = useState<'Both' | 'Morning' | 'Evening'>('Both');
  const [pauseReason, setPauseReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showResumePicker, setShowResumePicker] = useState(false);
  const [savingPause, setSavingPause] = useState(false);

  // Extend Pause Modal State
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendResumeDateObj, setExtendResumeDateObj] = useState<Date | null>(null);
  const [extendReason, setExtendReason] = useState('');
  const [showExtendPicker, setShowExtendPicker] = useState(false);
  const [savingExtend, setSavingExtend] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [savingCancel, setSavingCancel] = useState(false);

  // Shift Change Modal State
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [newSchedule, setNewSchedule] = useState<'Morning Only' | 'Evening Only' | 'Morning and Evening'>('Morning and Evening');
  const [shiftReason, setShiftReason] = useState('');
  const [savingShiftChange, setSavingShiftChange] = useState(false);
  const [morningShiftWindow, setMorningShiftWindow] = useState('06:00 AM - 08:30 AM');
  const [eveningShiftWindow, setEveningShiftWindow] = useState('05:00 PM - 07:30 PM');

  // History Filter State
  const [shiftFilter, setShiftFilter] = useState<'All' | 'Morning' | 'Evening'>('All');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Detail Breakdown Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [menuModalVisible, setMenuModalVisible] = useState(false);

  useEffect(() => {
    loadAllData();

    let s: any = null;
    const { initSocket } = require('../../services/socket');
    initSocket().then((sock: any) => {
      s = sock;
      s?.on('milk_event', (event: any) => {
        console.log('⚡ [Sell History Realtime Event - Silent Update]:', event?.action);
        // Silent background update so UI does NOT flicker, jump, or show loading screen
        loadAllData(true);
      });
    });

    return () => {
      s?.off('milk_event');
    };
  }, []);

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (d: Date | null | undefined) => {
    if (!d) return '';
    return d.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const loadAllData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      await Promise.all([fetchHistory(), fetchCycleStatus(), fetchConfig()]);
    } catch (e) {
      console.error('Load Sell History Error:', e);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await authApi.getMilkConfig();
      if (res.data?.success && res.data.config) {
        if (res.data.config.minAdvancePauseDays !== undefined) {
          setMinAdvanceDays(res.data.config.minAdvancePauseDays);
        }
        if (res.data.config.maxAutoApprovePauseDays !== undefined) {
          setMaxAutoApproveDays(res.data.config.maxAutoApprovePauseDays);
        }
        if (res.data.config.morningShiftWindow) {
          setMorningShiftWindow(res.data.config.morningShiftWindow);
        }
        if (res.data.config.eveningShiftWindow) {
          setEveningShiftWindow(res.data.config.eveningShiftWindow);
        }
      }
    } catch (e) {
      console.error('Fetch Config Error:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await authApi.getMilkHistory('sell');
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        const sub = res.data.subscription || null;
        setSubscription(sub);
        if (sub && sub.status !== 'cancelled') {
          AsyncStorage.setItem('cached_milk_sub', JSON.stringify(sub));
        } else {
          AsyncStorage.removeItem('cached_milk_sub');
        }
        if (res.data.walletBalance !== undefined) {
          setMainWalletBalance(res.data.walletBalance);
        }
      }
    } catch (e) {
      console.error('Fetch History Error:', e);
    }
  };

  const fetchCycleStatus = async () => {
    try {
      const res = await authApi.getMilkCycleStatus();
      if (res.data?.success) {
        setCycleData(res.data);
      }
    } catch (e) {
      console.error('Fetch Cycle Status Error:', e);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!cycleData?.isEligible) {
      return showAlert(
        hi ? 'निकासी उपलब्ध नहीं' : 'Withdrawal Not Available',
        hi
          ? `भुगतान चक्र पूर्ण होने में अभी ${cycleData?.daysRemaining || 7} दिन शेष हैं।`
          : `${cycleData?.daysRemaining || 7} day(s) remaining before withdrawal unlocks.`
      );
    }

    showAlert(
      hi ? 'वॉलेट में ट्रांसफर करें' : 'Confirm Wallet Transfer',
      hi
        ? `क्या आप संचित राशि ₹${cycleData?.accumulatedAmount} को अपने मुख्य कृषि नेक्स वॉलेट में ट्रांसफर करना चाहते हैं?`
        : `Transfer accumulated ₹${cycleData?.accumulatedAmount} directly to your main KrishiNex wallet?`,
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'ट्रांसफर करें' : 'Transfer Now',
          onPress: async () => {
            try {
              setWithdrawing(true);
              const res = await authApi.requestMilkWithdrawal();
              if (res.data?.success) {
                showAlert(
                  hi ? 'सफलतापूर्वक ट्रांसफर हुआ! 🎉' : 'Transfer Successful! 🎉',
                  hi
                    ? `₹${res.data.transferredAmount} आपके मुख्य वॉलेट में जुड़ गए हैं। आपका नया वॉलेट बैलेंस: ₹${res.data.newWalletBalance}`
                    : `₹${res.data.transferredAmount} deposited directly into your main wallet. New balance: ₹${res.data.newWalletBalance}`
                );
                loadAllData();
              }
            } catch (err: any) {
              const msg = err.response?.data?.error || (hi ? 'ट्रांसफर विफल रहा।' : 'Transfer failed.');
              showAlert(hi ? 'त्रुटि' : 'Error', msg);
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handlePauseService = async () => {
    if (!resumeDateObj) {
      return showAlert(
        hi ? 'तारीख चुनें' : 'Select Date',
        hi ? 'कृपया संभावित पुनः शुरू तारीख (कैलेंडर से) चुनें।' : 'Please select expected resumption date from calendar.'
      );
    }

    const startDayOnly = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const resumeDayOnly = new Date(resumeDateObj.getFullYear(), resumeDateObj.getMonth(), resumeDateObj.getDate());
    
    if (resumeDayOnly < startDayOnly) {
      return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'पुनः शुरू होने की तारीख रोक प्रारंभ तारीख से पहले नहीं हो सकती।' : 'Expected resume date cannot be before pause start date.');
    }

    try {
      setSavingPause(true);
      const res = await authApi.pauseMilkService({
        subscriptionId: subscription._id,
        pauseStartDate: formatDateStr(startDateObj),
        expectedResumeDate: formatDateStr(resumeDateObj),
        pauseReason,
        pauseShift,
      });
      if (res.data?.success) {
        showAlert(
          hi ? 'रोक अनुरोध दर्ज' : 'Pause Updated',
          res.data.message || (hi ? 'दूध सेवा अस्थायी रूप से रोक दी गई है।' : 'Milk service has been paused.')
        );
        setPauseModalVisible(false);
        loadAllData();
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to pause service');
    } finally {
      setSavingPause(false);
    }
  };

  const handleExtendService = async () => {
    if (!extendResumeDateObj) {
      return showAlert(
        hi ? 'तारीख चुनें' : 'Select Date',
        hi ? 'कृपया कैलेंडर से नई पुनः शुरू तारीख चुनें।' : 'Please select a new resume date from calendar.'
      );
    }

    const currentStart = subscription?.pauseStartDate ? new Date(subscription.pauseStartDate) : new Date();
    const newEndDay = new Date(extendResumeDateObj.getFullYear(), extendResumeDateObj.getMonth(), extendResumeDateObj.getDate());
    const startDayOnly = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());

    if (newEndDay <= startDayOnly) {
      return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नई समाप्ति तारीख रोक प्रारंभ तारीख के बाद होनी चाहिए।' : 'New resume date must be after pause start date.');
    }

    try {
      setSavingExtend(true);
      const res = await authApi.extendMilkPause({
        subscriptionId: subscription._id,
        newResumeDate: formatDateStr(extendResumeDateObj),
        reason: extendReason,
      });
      if (res.data?.success) {
        showAlert(
          hi ? 'रोक अवधि बढ़ाई गई' : 'Pause Extended',
          res.data.message || (hi ? 'रोक अवधि सफलतापूर्वक बढ़ा दी गई है।' : 'Pause duration extended successfully.')
        );
        setExtendModalVisible(false);
        loadAllData();
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to extend pause');
    } finally {
      setSavingExtend(false);
    }
  };

  const handleResumeService = async () => {
    showAlert(
      hi ? 'सेवा पुनः शुरू करें' : 'Confirm Service Resumption',
      hi ? 'क्या आप अपनी दूध सेवा आज से पुनः सक्रिय करना चाहते हैं?' : 'Are you sure you want to resume your daily milk service today?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'हाँ, शुरू करें' : 'Yes, Resume',
          onPress: async () => {
            try {
              const res = await authApi.resumeMilkService(subscription._id);
              if (res.data?.success) {
                showAlert(hi ? 'सेवा पुनः सक्रिय 🎉' : 'Service Resumed 🎉', hi ? 'दूध सेवा पुनः सक्रिय कर दी गई है।' : 'Milk service resumed successfully.');
                loadAllData();
              }
            } catch (err: any) {
              showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to resume service');
            }
          }
        }
      ]
    );
  };

  const handleCancelService = async () => {
    if (!agreementChecked) {
      return showAlert(hi ? 'शर्तें स्वीकार करें' : 'Terms Required', hi ? 'कृपया रद्दीकरण समझौते की शर्तें स्वीकार करें।' : 'Please accept the cancellation agreement.');
    }
    try {
      setSavingCancel(true);
      const res = await authApi.cancelMilkService({
        subscriptionId: subscription._id,
        cancellationReason,
        cancellationAgreementAccepted: true,
      });
      if (res.data?.success) {
        if (res.data.subscription) {
          await AsyncStorage.setItem('cached_milk_sub', JSON.stringify(res.data.subscription));
          setSubscription(res.data.subscription);
        }
        showAlert(
          hi ? 'रद्दीकरण अर्जी भेजी गई 🔒' : 'Cancellation Request Submitted 🔒',
          hi
            ? 'आपकी सेवा रद्दीकरण अर्जी एडमिन के पास समीक्षा के लिए भेज दी गई है। स्वीकृति मिलने तक सेवाएं लॉक रहेंगी।'
            : 'Your cancellation request is under review. Services are locked until admin approval.'
        );
        setCancelModalVisible(false);
        loadAllData();
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to cancel service');
    } finally {
      setSavingCancel(false);
    }
  };

  const handleRequestShiftChange = async () => {
    if (newSchedule === subscription?.deliverySchedule) {
      return showAlert(
        hi ? 'समान शिफ्ट' : 'Same Shift',
        hi ? 'आपकी वर्तमान संकलन शिफ्ट पहले से ही यही है।' : 'Selected shift is already your active supply shift.'
      );
    }
    try {
      setSavingShiftChange(true);
      const res = await authApi.requestShiftChange({
        subscriptionId: subscription._id,
        requestedSchedule: newSchedule,
        reason: shiftReason,
      });
      if (res.data?.success) {
        showAlert(
          hi ? 'अनुरोध दर्ज 🎉' : 'Request Submitted 🎉',
          res.data.message || (hi ? 'शिफ्ट बदलाव अनुरोध सफलतापूर्वक दर्ज कर दिया गया है।' : 'Shift change request submitted.')
        );
        setShiftModalVisible(false);
        loadAllData();
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to submit shift change request');
    } finally {
      setSavingShiftChange(false);
    }
  };

  const isPaused = subscription?.status === 'paused';
  const isShiftChangePending = subscription?.shiftChangeStatus === 'pending_approval';

  const filteredLogs = logs.filter(log => {
    if (shiftFilter !== 'All' && log.shift !== shiftFilter) {
      return false;
    }
    if (datePreset !== 'all') {
      const logDate = new Date(log.date);
      const now = new Date();
      if (datePreset === 'today') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (datePreset === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (logDate < weekAgo) return false;
      } else if (datePreset === 'month') {
        if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });
  const isPausePending = subscription?.pauseApprovalStatus === 'pending_approval';
  const isCancellationPending = subscription?.cancellationStatus === 'pending_approval';
  const isCancelledApproved = subscription?.status === 'cancelled' && subscription?.cancellationStatus !== 'pending_approval';
  const cycleDaysTotal = cycleData?.cycleDurationDays || 7;
  const cycleDaysDone = cycleData?.currentCycleDay !== undefined
    ? cycleData.currentCycleDay
    : (cycleData?.elapsedDays !== undefined ? cycleData.elapsedDays : 0);
  const progressRatio = Math.min(1, cycleDaysDone / cycleDaysTotal);

  // Advance notice min date calculation
  const todayOnly = new Date();
  todayOnly.setHours(0, 0, 0, 0);
  const minPauseStartDate = new Date(todayOnly.getTime() + minAdvanceDays * 24 * 60 * 60 * 1000);

  // Live Pause Duration calculation (Inclusive: 26 to 28 = 26, 27, 28 -> 3 days; 26 to 26 = 1 day)
  const startDayOnly = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
  const resumeDayOnly = resumeDateObj ? new Date(resumeDateObj.getFullYear(), resumeDateObj.getMonth(), resumeDateObj.getDate()) : null;
  const pauseDurationDays = resumeDayOnly ? Math.max(1, Math.round((resumeDayOnly.getTime() - startDayOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0;
  const isAutoApprove = pauseDurationDays > 0 ? pauseDurationDays <= maxAutoApproveDays : true;

  // Live Extend Duration calculation
  const currentPauseStart = subscription?.pauseStartDate ? new Date(subscription.pauseStartDate) : new Date();
  const currentPauseStartDay = new Date(currentPauseStart.getFullYear(), currentPauseStart.getMonth(), currentPauseStart.getDate());
  const extendEndDayOnly = extendResumeDateObj ? new Date(extendResumeDateObj.getFullYear(), extendResumeDateObj.getMonth(), extendResumeDateObj.getDate()) : null;
  const totalExtendDays = extendEndDayOnly ? Math.max(1, Math.round((extendEndDayOnly.getTime() - currentPauseStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0;
  const isExtendAutoApprove = totalExtendDays > 0 ? totalExtendDays <= maxAutoApproveDays : true;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>
            {subscription?.status === 'pending'
              ? (hi ? 'आवेदन समीक्षाधीन है' : 'Application Under Review')
              : (hi ? 'दूध बिक्री हिस्ट्री' : 'Milk Supply History')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {subscription?.status === 'pending'
              ? (hi ? 'प्रशासक स्वीकृति प्रतीक्षित' : 'Waiting for Admin Approval')
              : subscription
              ? `${subscription.dailyQuantityLiters} L/day • ₹${subscription.ratePerLiter || 0}/L`
              : (hi ? 'दैनिक संकलन' : 'Daily Supply')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/wallet')} style={styles.mainWalletPill}>
            <Ionicons name="wallet" size={14} color="#059669" />
            <Text style={styles.mainWalletText}>₹{mainWalletBalance}</Text>
          </TouchableOpacity>
          {subscription && subscription.status !== 'pending' && !isCancelledApproved && (
            <TouchableOpacity
              style={styles.headerMenuBtn}
              onPress={() => setMenuModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loaderText}>{hi ? 'लोड हो रहा है...' : 'Loading history...'}</Text>
        </View>
      ) : subscription?.status === 'pending' ? (
        /* DEDICATED WAITING FOR APPROVAL SCREEN (NOT HISTORY) */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* WAITING HERO CARD */}
          <View style={styles.waitingHeroCard}>
            <View style={styles.waitingIconRing}>
              <View style={styles.waitingIconCircle}>
                <Ionicons name="hourglass" size={38} color="#D97706" />
              </View>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusPillText}>
                {hi ? 'समीक्षाधीन (Under Review)' : 'Pending Approval'}
              </Text>
            </View>

            <Text style={styles.waitingMainTitle}>
              {hi ? 'दूध बिक्री आवेदन समीक्षाधीन है' : 'Milk Supply Application Under Review'}
            </Text>

            <Text style={styles.waitingMainDesc}>
              {hi
                ? 'आपका दूध बिक्री पंजीकरण KrishiNex एडमिन व फील्ड टीम के पास सत्यापन हेतु प्राप्त हो गया है। डेयरी पते की जांच व उचित भाव (Rate per Liter) तय होते ही आपकी सेवा स्वीकृत कर दी जाएगी और दैनिक संकलन हिस्ट्री स्क्रीन स्वतः सक्रिय हो जाएगी।'
                : 'Your milk supply registration is under admin review. Once verified and rate is finalized, your daily collection history will unlock automatically.'}
            </Text>

            {/* REALTIME SOCKET NOTICE */}
            <View style={styles.realtimeNoticeBox}>
              <Ionicons name="flash" size={16} color="#059669" />
              <Text style={styles.realtimeNoticeText}>
                {hi
                  ? '⚡ रियल-टाइम सिंक सक्रिय: एडमिन द्वारा स्वीकृति मिलते ही यह स्क्रीन तुरंत स्वतः खुल जाएगी (पेज रिफ्रेश करने की आवश्यकता नहीं)।'
                  : '⚡ Real-time Sync: Screen will unlock automatically as soon as admin approves (No refresh needed).'}
              </Text>
            </View>
          </View>

          {/* 3-STEP PROGRESS STEPPER */}
          <View style={styles.stepperContainer}>
            <Text style={styles.stepperHeaderTitle}>
              {hi ? 'आवेदन प्रगति स्थिति' : 'Application Progress'}
            </Text>

            {/* STEP 1 */}
            <View style={styles.stepItemRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepCircle, styles.stepCircleDone]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
                <View style={[styles.stepConnectorLine, styles.stepLineActive]} />
              </View>
              <View style={styles.stepTextContent}>
                <Text style={styles.stepTitleDone}>{hi ? '1. आवेदन दर्ज किया गया' : '1. Application Submitted'}</Text>
                <Text style={styles.stepDesc}>
                  {subscription?.createdAt
                    ? (hi ? `दिनांक: ${new Date(subscription.createdAt).toLocaleDateString('hi-IN')}` : `Date: ${new Date(subscription.createdAt).toLocaleDateString()}`)
                    : (hi ? 'सफलतापूर्वक दर्ज' : 'Submitted successfully')}
                </Text>
              </View>
            </View>

            {/* STEP 2 */}
            <View style={styles.stepItemRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepCircle, styles.stepCircleActive]}>
                  <Ionicons name="time" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stepConnectorLine} />
              </View>
              <View style={styles.stepTextContent}>
                <Text style={styles.stepTitleActive}>
                  {hi ? '2. एडमिन समीक्षा व दर निर्धारण' : '2. Field Review & Rate Assignment'}
                </Text>
                <Text style={styles.stepDescActive}>
                  {hi ? '⏳ वर्तमान स्थिति: फील्ड सत्यापन व एडमिन अनुमोदन जारी...' : '⏳ Current Status: Field verification and rate finalization...'}
                </Text>
              </View>
            </View>

            {/* STEP 3 */}
            <View style={styles.stepItemRow}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.stepCircle, styles.stepCircleLocked]}>
                  <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                </View>
              </View>
              <View style={styles.stepTextContent}>
                <Text style={styles.stepTitleLocked}>
                  {hi ? '3. दैनिक संकलन हिस्ट्री अनलॉक' : '3. Collection History & Payout Active'}
                </Text>
                <Text style={styles.stepDesc}>
                  {hi ? '🔒 अनुमोदन के पश्चात दैनिक संकलन रिकॉर्ड व वॉलेट संकलन निकासी उपलब्ध होगी।' : '🔒 Unlocks daily logs and direct wallet withdrawal once approved.'}
                </Text>
              </View>
            </View>
          </View>

          {/* APPLICATION DETAILS CARD */}
          <View style={styles.appSummaryCard}>
            <View style={styles.appSummaryHeader}>
              <Ionicons name="document-text-outline" size={18} color="#059669" />
              <Text style={styles.appSummaryTitle}>
                {hi ? 'पंजीकरण सारांश' : 'Application Summary'}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'दैनिक मात्रा:' : 'Daily Quantity:'}</Text>
                <Text style={styles.summaryValue}>{subscription.dailyQuantityLiters} L / दिन</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'सप्लाई शेड्यूल:' : 'Schedule:'}</Text>
                <Text style={styles.summaryValue}>{subscription.deliverySchedule || 'Morning'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'संकलन पता:' : 'Collection Address:'}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{subscription.address}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'दर प्रति लीटर:' : 'Rate/Liter:'}</Text>
                <Text style={[styles.summaryValue, { color: '#D97706', fontWeight: '800' }]}>
                  {subscription.ratePerLiter ? `₹${subscription.ratePerLiter}/L` : (hi ? 'एडमिन द्वारा तय की जाएगी' : 'To be assigned')}
                </Text>
              </View>
              <View style={[styles.summaryRow, { alignItems: 'center' }]}>
                <Text style={styles.summaryLabel}>{hi ? 'मिल्क पार्टनर:' : 'Partner:'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.summaryValue, { color: subscription.assignedPartnerId ? '#7C3AED' : '#64748B', fontWeight: '800' }]}>
                    {subscription.assignedPartnerId?.name || (hi ? 'असाइन किया जा रहा है' : 'Assigning Soon')}
                  </Text>
                  {subscription.assignedPartnerId?.phone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${subscription.assignedPartnerId.phone}`)}
                      style={{ padding: 4, backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}
                    >
                      <Ionicons name="call" size={13} color="#059669" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* ACTIONS: REFRESH & CANCEL */}
          <View style={styles.pendingActionsContainer}>
            <TouchableOpacity
              style={styles.refreshStatusBtn}
              onPress={() => { setRefreshing(true); loadAllData(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#059669" />
              <Text style={styles.refreshStatusBtnText}>
                {hi ? 'स्थिति रिफ्रेश करें' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelAppBtn}
              onPress={() => setCancelModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelAppBtnText}>
                {hi ? 'अनुरोध रद्द करें' : 'Cancel Application'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isCancellationPending ? (
        /* DEDICATED WAITING FOR CANCELLATION APPROVAL SCREEN */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* CANCELLATION WAITING HERO CARD */}
          <View style={[styles.waitingHeroCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', shadowColor: '#DC2626' }]}>
            <View style={[styles.waitingIconRing, { backgroundColor: 'rgba(254, 202, 202, 0.5)' }]}>
              <View style={[styles.waitingIconCircle, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                <Ionicons name="lock-closed" size={36} color="#DC2626" />
              </View>
            </View>

            <View style={[styles.statusPill, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <View style={[styles.pulseDot, { backgroundColor: '#DC2626' }]} />
              <Text style={[styles.statusPillText, { color: '#991B1B' }]}>
                {hi ? 'रद्दीकरण समीक्षाधीन (Cancellation Under Review)' : 'Cancellation Pending Approval'}
              </Text>
            </View>

            <Text style={[styles.waitingMainTitle, { color: '#7F1D1D' }]}>
              {hi ? 'सेवा रद्दीकरण अर्जी प्रक्रिया में है' : 'Service Cancellation Under Admin Review'}
            </Text>

            <Text style={[styles.waitingMainDesc, { color: '#991B1B' }]}>
              {hi
                ? 'आपने अपनी दूध बिक्री सेवा स्थायी रूप से रद्द करने हेतु अर्जी दी है। एडमिन द्वारा अर्जी स्वीकृत किए जाने तक आपकी सेवाएं व दैनिक संकलन पूरी तरह लॉक (स्थगित) रहेंगी।'
                : 'You have submitted a permanent cancellation request. Daily milk supply services remain strictly locked pending admin approval.'}
            </Text>

            {/* REALTIME SOCKET NOTICE */}
            <View style={[styles.realtimeNoticeBox, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
              <Ionicons name="flash" size={16} color="#E11D48" />
              <Text style={[styles.realtimeNoticeText, { color: '#9F1239' }]}>
                {hi
                  ? '⚡ रियल-टाइम सिंक सक्रिय: एडमिन द्वारा रद्दीकरण स्वीकार होते ही यह स्क्रीन स्वतः नई सेवा चुनने हेतु खुल जाएगी।'
                  : '⚡ Real-time Sync: Screen will unlock for a new service automatically upon admin acceptance.'}
              </Text>
            </View>
          </View>

          {/* CANCELLATION DETAILS CARD */}
          <View style={styles.appSummaryCard}>
            <View style={styles.appSummaryHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#DC2626" />
              <Text style={[styles.appSummaryTitle, { color: '#DC2626' }]}>
                {hi ? 'रद्दीकरण अर्जी विवरण' : 'Cancellation Request Details'}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'दैनिक संकलन मात्रा:' : 'Daily Quantity:'}</Text>
                <Text style={styles.summaryValue}>{subscription.dailyQuantityLiters} L / दिन</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'अर्जी दिनांक:' : 'Requested On:'}</Text>
                <Text style={styles.summaryValue}>
                  {subscription?.cancellationRequestedAt
                    ? new Date(subscription.cancellationRequestedAt).toLocaleDateString('hi-IN')
                    : (hi ? 'हाल ही में' : 'Recently')}
                </Text>
              </View>
              {subscription?.cancellationReason ? (
                <View style={[styles.summaryRow, { alignItems: 'flex-start' }]}>
                  <Text style={styles.summaryLabel}>{hi ? 'रद्दीकरण कारण:' : 'Reason:'}</Text>
                  <Text style={[styles.summaryValue, { color: '#B91C1C' }]}>{subscription.cancellationReason}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'वर्तमान स्थिति:' : 'Status:'}</Text>
                <Text style={[styles.summaryValue, { color: '#DC2626', fontWeight: '800' }]}>
                  {hi ? 'एडमिन स्वीकृति प्रतीक्षारत (Locked)' : 'Waiting for Admin Approval'}
                </Text>
              </View>
            </View>
          </View>

          {/* ACTION BUTTON */}
          <View style={styles.pendingActionsContainer}>
            <TouchableOpacity
              style={styles.refreshStatusBtn}
              onPress={() => { setRefreshing(true); loadAllData(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#059669" />
              <Text style={styles.refreshStatusBtnText}>
                {hi ? 'स्थिति रिफ्रेश करें' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : subscription?.status === 'rejected' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
        >
          <View style={styles.rejectedHeroCard}>
            <View style={styles.rejectedIconCircle}>
              <Ionicons name="close-circle" size={44} color="#DC2626" />
            </View>
            <Text style={styles.rejectedTitle}>
              {hi ? 'आवेदन अस्वीकृत (Application Rejected)' : 'Application Rejected'}
            </Text>
            <Text style={styles.rejectedReason}>
              {subscription.rejectionReason || (hi ? 'प्रशासनिक कारणों से आपका आवेदन अस्वीकृत किया गया है।' : 'Your application was rejected by admin.')}
            </Text>
            <TouchableOpacity
              style={styles.reapplyBtn}
              onPress={() => router.replace({ pathname: '/milk/register', params: { type: 'sell' } })}
            >
              <Text style={styles.reapplyBtnText}>{hi ? 'पुनः आवेदन करें' : 'Apply Again'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : !subscription || subscription?.status === 'cancelled' ? (
        <View style={styles.loaderCenter}>
          <Ionicons name="water-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>{hi ? 'कोई सक्रिय दूध सेवा नहीं है।' : 'No active milk service found.'}</Text>
          <TouchableOpacity
            style={[styles.reapplyBtn, { marginTop: 16 }]}
            onPress={() => router.replace('/milk')}
          >
            <Text style={styles.reapplyBtnText}>{hi ? 'दूध सेवा शुरू करें' : 'Start Milk Service'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* APPROVED OR PAUSED: ACTIVE HISTORY SCREEN */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAllData(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* PAUSED BANNER OR PENDING APPROVAL BANNER */}
          {(isPaused || isPausePending) && (
            <View style={[styles.pausedBanner, isPausePending && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <View style={styles.pausedTopRow}>
                <View style={[styles.pausedIconBox, isPausePending && { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons 
                    name={isPausePending ? 'time' : 'pause-circle'} 
                    size={24} 
                    color={isPausePending ? '#D97706' : '#7C3AED'} 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.pausedTitle, isPausePending && { color: '#92400E' }]}>
                    {isPausePending
                      ? (hi ? 'रोक अनुरोध समीक्षाधीन है (> 7 दिन)' : 'Pause Under Review (> 7 Days)')
                      : (hi ? 'दूध सेवा अस्थायी रूप से रोकी गई है' : 'Milk Service Temporarily Paused')}
                  </Text>
                  <Text style={[styles.pausedSubtitle, isPausePending && { color: '#B45309' }]}>
                    {hi
                      ? `अवधि: ${subscription.pauseStartDate ? new Date(subscription.pauseStartDate).toLocaleDateString('hi-IN') : 'N/A'} से ${subscription.expectedResumeDate ? new Date(subscription.expectedResumeDate).toLocaleDateString('hi-IN') : 'N/A'} (${subscription.pauseRequestedDays || 0} दिन • ${subscription.pauseShift === 'Morning' ? 'सुबह' : subscription.pauseShift === 'Evening' ? 'शाम' : 'दोनों समय'})`
                      : `Window: ${subscription.pauseStartDate ? new Date(subscription.pauseStartDate).toLocaleDateString() : 'N/A'} to ${subscription.expectedResumeDate ? new Date(subscription.expectedResumeDate).toLocaleDateString() : 'N/A'} (${subscription.pauseRequestedDays || 0} days • ${subscription.pauseShift || 'Both Shifts'})`}
                  </Text>
                  {subscription?.pauseReason ? (
                    <Text style={[styles.pausedReasonText, isPausePending && { color: '#92400E' }]}>
                      {hi ? `कारण: ${subscription.pauseReason}` : `Reason: ${subscription.pauseReason}`}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Action Buttons: Resume & Extend */}
              <View style={styles.pausedActionsRow}>
                <TouchableOpacity onPress={handleResumeService} style={styles.resumeActionBtn} activeOpacity={0.85}>
                  <Ionicons name="play" size={15} color="#FFFFFF" />
                  <Text style={styles.resumeActionBtnText}>{hi ? 'सेवा पुनः शुरू करें' : 'Resume Service'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => {
                    setExtendResumeDateObj(null); // Keep empty until farmer selects from calendar
                    setExtendReason('');
                    setExtendModalVisible(true);
                  }} 
                  style={styles.extendActionBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar" size={15} color="#7C3AED" />
                  <Text style={styles.extendActionBtnText}>{hi ? 'रोक अवधि बढ़ाएं' : 'Extend Pause'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 7-DAY ROLLOUT WITHDRAWAL CARD */}
          <LinearGradient
            colors={['#065F46', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rolloutCard}
          >
            <View style={styles.rolloutTopRow}>
              <View>
                <Text style={styles.rolloutLabel}>
                  {hi ? 'संचित दूध कमाई (Unwithdrawn)' : 'Accumulated Cycle Earnings'}
                </Text>
                <Text style={styles.rolloutAmount}>₹{cycleData?.accumulatedAmount || 0}</Text>
              </View>
              <View style={styles.cycleBadge}>
                <Ionicons name="time-outline" size={14} color="#D1FAE5" />
                <Text style={styles.cycleBadgeText}>
                  {hi ? `दिन ${cycleDaysDone} / ${cycleDaysTotal}` : `Day ${cycleDaysDone} of ${cycleDaysTotal}`}
                </Text>
              </View>
            </View>

            {/* PROGRESS BAR */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>

            <View style={styles.rolloutStatusRow}>
              <Text style={styles.rolloutStatusText}>
                {cycleData?.isEligible
                  ? (hi ? '✓ चक्र पूर्ण! निकासी हेतु तैयार' : '✓ Cycle Completed! Ready to withdraw')
                  : (hi
                    ? `निकासी अनलॉक में ${cycleData?.daysRemaining !== undefined ? cycleData.daysRemaining : 6} दिन शेष हैं`
                    : `${cycleData?.daysRemaining !== undefined ? cycleData.daysRemaining : 6} day(s) remaining for withdrawal`)}
              </Text>
            </View>

            {/* DIRECT WITHDRAWAL BUTTON */}
            <TouchableOpacity
              style={[
                styles.withdrawBtn,
                (!cycleData?.isEligible || (cycleData?.accumulatedAmount || 0) <= 0 || withdrawing) && styles.withdrawBtnDisabled,
              ]}
              onPress={handleWithdrawalRequest}
              disabled={!cycleData?.isEligible || (cycleData?.accumulatedAmount || 0) <= 0 || withdrawing}
              activeOpacity={0.85}
            >
              {withdrawing ? (
                <ActivityIndicator color="#065F46" />
              ) : (
                <>
                  <Ionicons name="wallet-outline" size={18} color={cycleData?.isEligible ? '#065F46' : '#94A3B8'} />
                  <Text
                    style={[styles.withdrawBtnText, !cycleData?.isEligible && { color: '#94A3B8' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {hi ? 'वॉलेट में ट्रांसफर करें (Withdraw to Wallet)' : 'Withdraw to Main Wallet'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.rolloutFootnote}>
              {hi
                ? 'निकासी करने पर राशि तुरंत आपके मुख्य कृषि नेक्स वॉलेट में जुड़ जाएगी।'
                : 'Transfers directly into your main KrishiNex wallet. Next cycle starts immediately.'}
            </Text>
          </LinearGradient>

          {/* ASSIGNED MILK PARTNER CARD */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerTopRow}>
              <View style={styles.partnerAvatarRing}>
                {subscription?.assignedPartnerId?.profilePhotoUrl ? (
                  <Image
                    source={{
                      uri: subscription.assignedPartnerId.profilePhotoUrl.startsWith('http')
                        ? subscription.assignedPartnerId.profilePhotoUrl
                        : `${IMAGE_BASE_URL}/${subscription.assignedPartnerId.profilePhotoUrl.replace(/\\/g, '/')}`
                    }}
                    style={styles.partnerAvatarImg}
                  />
                ) : (
                  <Ionicons name="bicycle" size={20} color="#7C3AED" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.partnerSectionSub}>
                  {hi ? 'अधिकृत मिल्क पार्टनर' : 'Assigned Milk Partner'}
                </Text>
                <Text style={styles.partnerNameText}>
                  {subscription?.assignedPartnerId?.name || (hi ? 'पार्टनर जल्द ही असाइन होगा' : 'Assigning Soon')}
                </Text>
                <Text style={styles.partnerMetaText}>
                  {subscription?.assignedPartnerId?.vehicleType || 'Bike'}
                  {subscription?.assignedPartnerId?.vehicleType !== 'Cycle' && (
                    ` • ${subscription?.assignedPartnerId?.vehicleNumber || (hi ? 'वाहन नंबर प्रतीक्षारत' : 'No Vehicle Reg')}`
                  )}
                  {subscription?.assignedPartnerId?.assignedRoute ? ` • ${subscription.assignedPartnerId.assignedRoute}` : ''}
                </Text>
              </View>
              {subscription?.assignedPartnerId?.phone ? (
                <TouchableOpacity
                  style={styles.partnerCallBtn}
                  onPress={() => Linking.openURL(`tel:${subscription.assignedPartnerId.phone}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={14} color="#FFFFFF" />
                  <Text style={styles.partnerCallBtnText}>{hi ? 'कॉल करें' : 'Call'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* CANCELLATION PENDING BANNER (LOCKED STATE) */}
          {isCancellationPending && (
            <View style={styles.cancellationPendingCard}>
              <View style={styles.cancellationHeaderRow}>
                <View style={styles.cancellationLockCircle}>
                  <Ionicons name="lock-closed" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cancellationTitle}>
                    {hi ? 'रद्दीकरण अर्जी समीक्षाधीन है (Locked)' : 'Cancellation Under Review (Locked)'}
                  </Text>
                  <Text style={styles.cancellationSubtitle}>
                    {hi
                      ? 'आपने अपनी दूध बिक्री सेवा स्थायी रूप से रद्द करने की अर्जी दी है। एडमिन द्वारा अर्जी स्वीकृत किए जाने तक सेवाएं लॉक रहेंगी।'
                      : 'You requested permanent cancellation. All service actions are locked pending admin review.'}
                  </Text>
                </View>
              </View>
              {subscription?.cancellationReason ? (
                <View style={styles.cancellationReasonBox}>
                  <Text style={styles.cancellationReasonText}>
                    {hi ? 'अर्जी का कारण: ' : 'Reason: '}
                    <Text style={{ fontWeight: '700', color: '#991B1B' }}>{subscription.cancellationReason}</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* CANCELLATION APPROVED BANNER */}
          {isCancelledApproved && (
            <View style={styles.cancelledApprovedCard}>
              <Ionicons name="checkmark-circle" size={32} color="#059669" />
              <Text style={styles.cancelledApprovedTitle}>
                {hi ? 'सेवा स्थायी रूप से रद्द कर दी गई है' : 'Service Successfully Cancelled'}
              </Text>
              <Text style={styles.cancelledApprovedSub}>
                {hi
                  ? 'एडमिन द्वारा आपकी रद्दीकरण अर्जी स्वीकार कर ली गई है। यदि आप पुनः सेवा शुरू करना चाहते हैं तो नीचे दिए बटन से नई अर्जी दें।'
                  : 'Your service cancellation has been approved by admin. You can now apply for a new milk service.'}
              </Text>
              <TouchableOpacity
                style={styles.newServiceBtn}
                onPress={async () => {
                  await AsyncStorage.removeItem('cached_milk_sub');
                  router.replace('/milk' as any);
                }}
              >
                <Text style={styles.newServiceBtnText}>
                  {hi ? 'नई सेवा चुनें (Buy / Sell)' : 'Choose New Service (Buy / Sell)'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* SERVICE MANAGEMENT BUTTONS */}
          {isCancellationPending ? (
            <View style={styles.lockedActionBox}>
              <Ionicons name="lock-closed" size={16} color="#DC2626" />
              <Text style={styles.lockedActionText}>
                {hi ? 'रद्दीकरण प्रक्रियाधीन होने से सेवाएं लॉक हैं' : 'Service actions locked pending cancellation review'}
              </Text>
            </View>
          ) : !isCancelledApproved ? (
            <>
              {/* PENDING SHIFT CHANGE BANNER */}
              {isShiftChangePending && (
                <View style={styles.shiftPendingCard}>
                  <View style={styles.shiftPendingHeader}>
                    <View style={styles.shiftPendingIconCircle}>
                      <Ionicons name="time" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.shiftPendingTitle}>
                        {hi ? 'शिफ्ट बदलाव अनुरोध समीक्षाधीन है' : 'Shift Change Pending Review'}
                      </Text>
                      <Text style={styles.shiftPendingSub}>
                        {hi
                          ? `अनुरोधित नई शिफ्ट: ${
                              subscription.requestedSchedule === 'Morning and Evening'
                                ? 'सुबह और शाम दोनों'
                                : subscription.requestedSchedule === 'Evening Only'
                                ? 'केवल शाम'
                                : 'केवल सुबह'
                            }`
                          : `Requested: ${subscription.requestedSchedule}`}
                      </Text>
                      {subscription?.shiftChangeReason ? (
                        <Text style={styles.shiftPendingReasonText}>
                          {hi ? `कारण: ${subscription.shiftChangeReason}` : `Reason: ${subscription.shiftChangeReason}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : null}

          {/* CALENDAR-WISE DELIVERY LOGS HEADER */}
          <View style={styles.sectionHeadingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="receipt-outline" size={18} color="#059669" />
              <Text style={styles.sectionHeading}>{hi ? 'दैनिक दूध आपूर्ति रिकॉर्ड' : 'Daily Supply Records'}</Text>
            </View>
            <View style={styles.filterCountBadgeContainer}>
              <Text style={[styles.filterCountBadge, { color: '#059669', backgroundColor: '#DCFCE7' }]}>
                {filteredLogs.length} {hi ? 'प्रविष्टियां' : 'entries'}
              </Text>
            </View>
          </View>

          {/* PREMIUM INTERACTIVE FILTER CARD */}
          <View style={styles.filterCard}>
            {/* 1. SHIFT SELECTOR */}
            <View style={styles.filterSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.filterSectionTitle}>{hi ? 'आपूर्ति शिफ्ट' : 'SUPPLY SHIFT'}</Text>
              </View>
              {shiftFilter !== 'All' && (
                <View style={[styles.filterActiveBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.filterActiveBadgeText, { color: '#059669' }]}>
                    {shiftFilter === 'Morning' ? (hi ? 'सुबह सक्रिय' : 'Morning Active') : (hi ? 'शाम सक्रिय' : 'Evening Active')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.filterSegmentedRow}>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, shiftFilter === 'All' && [styles.filterSegmentBtnActive, { backgroundColor: '#059669', borderColor: '#059669' }]]}
                onPress={() => setShiftFilter('All')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="grid-outline"
                  size={13}
                  color={shiftFilter === 'All' ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.filterSegmentBtnText, shiftFilter === 'All' && styles.filterSegmentBtnTextActive]}>
                  {hi ? 'सभी शिफ्ट' : 'All Shifts'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterSegmentBtn, shiftFilter === 'Morning' && [styles.filterSegmentBtnActive, { backgroundColor: '#059669', borderColor: '#059669' }]]}
                onPress={() => setShiftFilter('Morning')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="sunny"
                  size={14}
                  color={shiftFilter === 'Morning' ? '#FFFFFF' : '#D97706'}
                />
                <Text style={[styles.filterSegmentBtnText, shiftFilter === 'Morning' && styles.filterSegmentBtnTextActive]}>
                  {hi ? 'सुबह' : 'Morning'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterSegmentBtn, shiftFilter === 'Evening' && [styles.filterSegmentBtnActive, { backgroundColor: '#059669', borderColor: '#059669' }]]}
                onPress={() => setShiftFilter('Evening')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="moon"
                  size={13}
                  color={shiftFilter === 'Evening' ? '#FFFFFF' : '#6366F1'}
                />
                <Text style={[styles.filterSegmentBtnText, shiftFilter === 'Evening' && styles.filterSegmentBtnTextActive]}>
                  {hi ? 'शाम' : 'Evening'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DIVIDER */}
            <View style={styles.filterCardDivider} />

            {/* 2. TIME PERIOD SELECTOR */}
            <View style={styles.filterSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="calendar-outline" size={13} color="#64748B" />
                <Text style={styles.filterSectionTitle}>{hi ? 'समय अवधि' : 'TIME PERIOD'}</Text>
              </View>
              {(shiftFilter !== 'All' || datePreset !== 'all') && (
                <TouchableOpacity
                  onPress={() => {
                    setShiftFilter('All');
                    setDatePreset('all');
                  }}
                  style={[styles.filterResetLink, { backgroundColor: '#ECFDF5' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={11} color="#059669" />
                  <Text style={[styles.filterResetLinkText, { color: '#059669' }]}>{hi ? 'रीसेट करें' : 'Reset'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.datePresetsRow}>
              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'all' && [styles.datePresetPillActive, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]]}
                onPress={() => setDatePreset('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'all' && [styles.datePresetPillTextActive, { color: '#15803D' }]]}>
                  {hi ? 'पूरा इतिहास' : 'All Time'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'today' && [styles.datePresetPillActive, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]]}
                onPress={() => setDatePreset('today')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'today' && [styles.datePresetPillTextActive, { color: '#15803D' }]]}>
                  {hi ? 'आज' : 'Today'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'week' && [styles.datePresetPillActive, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]]}
                onPress={() => setDatePreset('week')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'week' && [styles.datePresetPillTextActive, { color: '#15803D' }]]}>
                  {hi ? 'इस हफ्ते' : 'This Week'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'month' && [styles.datePresetPillActive, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]]}
                onPress={() => setDatePreset('month')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'month' && [styles.datePresetPillTextActive, { color: '#15803D' }]]}>
                  {hi ? 'इस महीने' : 'This Month'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="file-tray-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {logs.length === 0
                  ? (hi ? 'अभी तक कोई आपूर्ति रिकॉर्ड नहीं है।' : 'No delivery logs recorded yet.')
                  : (hi ? 'चयनित फ़िल्टर अनुसार कोई रिकॉर्ड नहीं मिला।' : 'No records match selected filter.')}
              </Text>
              {logs.length > 0 && (shiftFilter !== 'All' || datePreset !== 'all') ? (
                <TouchableOpacity
                  onPress={() => {
                    setShiftFilter('All');
                    setDatePreset('all');
                  }}
                  style={styles.resetFilterBtn}
                >
                  <Text style={styles.resetFilterBtnText}>{hi ? 'फ़िल्टर हटाएं (Reset)' : 'Reset Filters'}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptySubtext}>
                  {hi ? 'दूध पार्टनर द्वारा संकलन दर्ज करते ही यहाँ विवरण दिखेगा।' : 'Daily entries will appear here once partner collects milk.'}
                </Text>
              )}
            </View>
          ) : (
            filteredLogs.map(log => {
              const logDate = new Date(log.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              return (
                <TouchableOpacity
                  key={log._id}
                  style={styles.logCard}
                  onPress={() => setSelectedLog(log)}
                  activeOpacity={0.75}
                >
                  <View style={styles.logLeft}>
                    <View style={styles.shiftBadge}>
                      <Ionicons
                        name={log.shift === 'Morning' ? 'sunny-outline' : 'moon-outline'}
                        size={16}
                        color="#059669"
                      />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.logDate}>{logDate}</Text>
                      <Text style={styles.logShift}>
                        {log.shift === 'Morning' ? (hi ? 'सुबह की पाली' : 'Morning Shift') : (hi ? 'शाम की पाली' : 'Evening Shift')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    <Text style={styles.logQty}>{log.quantityLiters} L</Text>
                    <Text style={styles.logRate}>₹{log.ratePerLiter}/L</Text>
                    <Text style={styles.logTotal}>+₹{log.totalAmount}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {log.isProcessedInWithdrawal ? (
                        <Text style={styles.withdrawnBadge}>
                          {hi ? 'वॉलेट में अंतरित' : 'Withdrawn'}
                        </Text>
                      ) : (
                        <Text style={[styles.withdrawnBadge, { backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' }]}>
                          {hi ? 'संचित' : 'Accumulated'}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 3-DOTS QUICK ACTION MENU MODAL */}
      <Modal visible={menuModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          activeOpacity={1}
          onPress={() => setMenuModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.actionSheetContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            {/* DRAG HANDLE */}
            <View style={styles.actionSheetHandle} />

            {/* HEADER */}
            <View style={styles.actionSheetHeader}>
              <View>
                <Text style={styles.actionSheetTitle}>
                  {hi ? 'सेवा प्रबंधन विकल्प' : 'Supply Options'}
                </Text>
                <Text style={styles.actionSheetSub}>
                  {subscription?.status === 'paused'
                    ? (hi ? 'वर्तमान स्थिति: आपूर्ति अस्थायी रुकी हुई' : 'Status: Currently Paused')
                    : (hi ? 'वर्तमान स्थिति: सक्रिय दूध बिक्री सेवा' : 'Status: Active Supply Subscription')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuModalVisible(false)}
                style={styles.actionSheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* IF CANCELLATION PENDING */}
            {isCancellationPending ? (
              <View style={styles.actionSheetLockedBox}>
                <Ionicons name="lock-closed" size={20} color="#DC2626" />
                <Text style={styles.actionSheetLockedText}>
                  {hi
                    ? 'आपकी स्थायी रद्दीकरण अर्जी समीक्षा में है। सभी कार्यवाहियां लॉक हैं।'
                    : 'Cancellation request is pending admin review. All actions are locked.'}
                </Text>
              </View>
            ) : (
              <View style={styles.actionSheetOptionsList}>
                {/* 1. PAUSE OR RESUME */}
                {isPaused ? (
                  <TouchableOpacity
                    style={styles.actionSheetOptionItem}
                    onPress={() => {
                      setMenuModalVisible(false);
                      handleResumeService();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionSheetOptionIconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="play" size={20} color="#15803D" />
                    </View>
                    <View style={styles.actionSheetOptionContent}>
                      <Text style={[styles.actionSheetOptionTitle, { color: '#15803D' }]}>
                        {hi ? 'आपूर्ति पुनः शुरू करें (Resume)' : 'Resume Milk Supply'}
                      </Text>
                      <Text style={styles.actionSheetOptionSub}>
                        {hi ? 'अस्थायी रोक समाप्त कर दैनिक दूध संकलन पुनः शुरू करें' : 'End temporary pause and restart daily milk collection'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionSheetOptionItem}
                    onPress={() => {
                      setMenuModalVisible(false);
                      const s = new Date();
                      s.setHours(0, 0, 0, 0);
                      s.setDate(s.getDate() + minAdvanceDays);
                      setStartDateObj(s);
                      setResumeDateObj(null);
                      setPauseReason('');
                      setPauseModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionSheetOptionIconCircle, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="pause" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.actionSheetOptionContent}>
                      <Text style={[styles.actionSheetOptionTitle, { color: '#0F172A' }]}>
                        {hi ? 'आपूर्ति अस्थायी रोकें (Pause)' : 'Pause Milk Supply'}
                      </Text>
                      <Text style={styles.actionSheetOptionSub}>
                        {hi ? 'अनुपलब्धता या छुट्टी के दिनों के लिए आपूर्ति रोकें' : 'Temporarily pause supply for upcoming dates'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {/* 2. CHANGE SHIFT */}
                <TouchableOpacity
                  style={styles.actionSheetOptionItem}
                  onPress={() => {
                    setMenuModalVisible(false);
                    setNewSchedule(subscription?.deliverySchedule || 'Morning Only');
                    setShiftReason('');
                    setShiftModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionSheetOptionIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.actionSheetOptionContent}>
                    <Text style={[styles.actionSheetOptionTitle, { color: '#0F172A' }]}>
                      {hi ? 'आपूर्ति शिफ्ट बदलें' : 'Change Supply Shift'}
                    </Text>
                    <Text style={styles.actionSheetOptionSub}>
                      {hi ? 'सुबह, शाम या दोनों समय की शिफ्ट में बदलाव का अनुरोध' : 'Request switch between Morning, Evening or Both'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.actionSheetDivider} />

                {/* 3. CANCEL SERVICE */}
                <TouchableOpacity
                  style={[styles.actionSheetOptionItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setMenuModalVisible(false);
                    setCancelModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionSheetOptionIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <View style={styles.actionSheetOptionContent}>
                    <Text style={[styles.actionSheetOptionTitle, { color: '#DC2626' }]}>
                      {hi ? 'सेवा स्थायी रूप से रद्द करें' : 'Cancel Supply Service'}
                    </Text>
                    <Text style={styles.actionSheetOptionSub}>
                      {hi ? 'दूध बिक्री सेवा स्थायी रूप से समाप्त करने की अर्जी दें' : 'Submit request to permanently stop milk supply service'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PAUSE MODAL WITH CALENDAR DATEPICKER */}
      <Modal visible={pauseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="pause" size={16} color="#7C3AED" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'सेवा अस्थायी रूप से रोकें' : 'Temporary Pause Service'}</Text>
              </View>
              <TouchableOpacity onPress={() => setPauseModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? 'यदि मवेशी दूध देना बंद कर दें या आप बाहर जा रहे हों, तो आप सेवा अस्थायी रूप से रोक सकते हैं।'
                : 'Pause daily milk supply temporarily. You can extend or resume anytime.'}
            </Text>

            {/* Advance Notice Helper */}
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle" size={18} color="#0284C7" />
              <Text style={styles.noticeText}>
                {hi
                  ? `प्रबंधन नियम: कम से कम ${minAdvanceDays} दिन पूर्व (${formatDisplayDate(minPauseStartDate)}) आवेदन आवश्यक है।`
                  : `Notice Rule: Must submit at least ${minAdvanceDays} day(s) in advance (${formatDisplayDate(minPauseStartDate)}).`}
              </Text>
            </View>

            {/* Date Picker Button: Start Date */}
            <Text style={styles.fieldLabel}>{hi ? 'रोक प्रारंभ तारीख (कैलेंडर से चुनें):' : 'Pause Start Date:'}</Text>
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
              <Text style={styles.datePickerBtnText}>{formatDisplayDate(startDateObj)}</Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Date Picker Button: Resume Date */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{hi ? 'संभावित पुनः शुरू तारीख (कैलेंडर से चुनें):' : 'Expected Resumption Date:'}</Text>
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowResumePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={resumeDateObj ? "#7C3AED" : "#94A3B8"} />
              <Text style={[styles.datePickerBtnText, !resumeDateObj && { color: '#94A3B8', fontWeight: '500' }]}>
                {resumeDateObj ? formatDisplayDate(resumeDateObj) : (hi ? 'कैलेंडर से तारीख चुनें' : 'Select Date from Calendar')}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Shift Selection: Morning, Evening, Both */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{hi ? 'रोक पाली (Shift):' : 'Pause Shift:'}</Text>
            <View style={styles.shiftSelectorRow}>
              <TouchableOpacity
                style={[styles.shiftOptionBtn, pauseShift === 'Both' && styles.shiftOptionBtnActive]}
                onPress={() => setPauseShift('Both')}
                activeOpacity={0.8}
              >
                <Ionicons name="sunny" size={14} color={pauseShift === 'Both' ? '#FFFFFF' : '#64748B'} />
                <Ionicons name="moon" size={14} color={pauseShift === 'Both' ? '#FFFFFF' : '#64748B'} style={{ marginLeft: -6 }} />
                <Text style={[styles.shiftOptionText, pauseShift === 'Both' && styles.shiftOptionTextActive]}>
                  {hi ? 'दोनों (Both)' : 'Both'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shiftOptionBtn, pauseShift === 'Morning' && styles.shiftOptionBtnActive]}
                onPress={() => setPauseShift('Morning')}
                activeOpacity={0.8}
              >
                <Ionicons name="sunny-outline" size={15} color={pauseShift === 'Morning' ? '#FFFFFF' : '#D97706'} />
                <Text style={[styles.shiftOptionText, pauseShift === 'Morning' && styles.shiftOptionTextActive]}>
                  {hi ? 'सुबह (Morning)' : 'Morning'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shiftOptionBtn, pauseShift === 'Evening' && styles.shiftOptionBtnActive]}
                onPress={() => setPauseShift('Evening')}
                activeOpacity={0.8}
              >
                <Ionicons name="moon-outline" size={15} color={pauseShift === 'Evening' ? '#FFFFFF' : '#4F46E5'} />
                <Text style={[styles.shiftOptionText, pauseShift === 'Evening' && styles.shiftOptionTextActive]}>
                  {hi ? 'शाम (Evening)' : 'Evening'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Live 7-Day Auto Approval Indicator */}
            {resumeDateObj ? (
              <View style={[styles.approvalRuleBox, isAutoApprove ? styles.autoApproveBg : styles.adminApprovalBg]}>
                <Ionicons 
                  name={isAutoApprove ? 'flash' : 'alert-circle'} 
                  size={18} 
                  color={isAutoApprove ? '#059669' : '#D97706'} 
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.approvalRuleTitle, { color: isAutoApprove ? '#065F46' : '#92400E' }]}>
                    {isAutoApprove 
                      ? (hi ? `⚡ स्वतः स्वीकृत (Auto-Approved) - ${pauseDurationDays} दिन` : `⚡ Auto-Approved (${pauseDurationDays} days)`)
                      : (hi ? `⚠️ एडमिन अनुमोदन आवश्यक (> ${maxAutoApproveDays} दिन)` : `⚠️ Admin Approval Required (> ${maxAutoApproveDays} days)`)}
                  </Text>
                  <Text style={[styles.approvalRuleSub, { color: isAutoApprove ? '#047857' : '#B45309' }]}>
                    {isAutoApprove
                      ? (hi ? `${maxAutoApproveDays} दिन या कम की रोक आवेदन करते ही स्वतः प्रभावी हो जाएगी।` : `Pauses up to ${maxAutoApproveDays} days are approved automatically without waiting.`)
                      : (hi ? `${maxAutoApproveDays} दिन से अधिक (${pauseDurationDays} दिन) होने के कारण एडमिन द्वारा समीक्षा के बाद ही रोक लागू होगी।` : `Pauses over ${maxAutoApproveDays} days will be applied after administrative approval.`)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.approvalRuleBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#64748B" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.approvalRuleTitle, { color: '#334155' }]}>
                    {hi ? 'पुनः शुरू तारीख चुनें' : 'Choose Resumption Date'}
                  </Text>
                  <Text style={[styles.approvalRuleSub, { color: '#64748B' }]}>
                    {hi
                      ? `${maxAutoApproveDays} दिन तक की रोक स्वतः स्वीकृत होगी। उससे अधिक पर एडमिन समीक्षा होगी।`
                      : `Pauses up to ${maxAutoApproveDays} days are auto-approved. Longer pauses require admin review.`}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{hi ? 'रोकने का कारण (वैकल्पिक):' : 'Reason (Optional):'}</Text>
            <TextInput
              style={styles.modalInput}
              value={pauseReason}
              onChangeText={setPauseReason}
              placeholder={hi ? 'उदा. गाय दूध नहीं दे रही' : 'e.g. Dry period'}
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.modalActionBtn, (savingPause || !resumeDateObj) && { opacity: resumeDateObj ? 0.6 : 0.85 }]}
              onPress={handlePauseService}
              disabled={savingPause}
              activeOpacity={0.85}
            >
              {savingPause ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionText}>
                  {!resumeDateObj
                    ? (hi ? 'तारीख चुनकर आगे बढ़ें' : 'Select Date to Proceed')
                    : isAutoApprove 
                    ? (hi ? `सेवा रोकें (${pauseDurationDays} दिन स्वतः स्वीकृत)` : `Confirm Pause (${pauseDurationDays} Days Auto)`)
                    : (hi ? `रोक अनुरोध भेजें (${pauseDurationDays} दिन एडमिन समीक्षा)` : `Submit Request (${pauseDurationDays} Days Review)`)}
                </Text>
              )}
            </TouchableOpacity>

            {/* Android / iOS DateTimePickers */}
            {showStartPicker && (
              <DateTimePicker
                value={startDateObj}
                mode="date"
                display="default"
                minimumDate={minPauseStartDate}
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) {
                    setStartDateObj(selectedDate);
                    if (resumeDateObj && selectedDate > resumeDateObj) {
                      setResumeDateObj(selectedDate);
                    }
                  }
                }}
              />
            )}

            {showResumePicker && (
              <DateTimePicker
                value={resumeDateObj || startDateObj}
                mode="date"
                display="default"
                minimumDate={startDateObj}
                onChange={(event, selectedDate) => {
                  setShowResumePicker(false);
                  if (selectedDate) {
                    setResumeDateObj(selectedDate);
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* EXTEND PAUSE MODAL */}
      <Modal visible={extendModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar" size={16} color="#7C3AED" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'रोक अवधि बढ़ाएं' : 'Extend Pause Duration'}</Text>
              </View>
              <TouchableOpacity onPress={() => setExtendModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? 'वर्तमान रोक समाप्ति तिथि को आगे बढ़ाएं। कुल अवधि 7 दिन से अधिक होने पर एडमिन अनुमोदन आवश्यक होगा।'
                : 'Extend your current pause period. Total duration exceeding 7 days requires admin review.'}
            </Text>

            {/* Current Info */}
            <View style={styles.noticeBox}>
              <Ionicons name="time-outline" size={18} color="#7C3AED" />
              <Text style={styles.noticeText}>
                {hi
                  ? `प्रारंभ तिथि: ${subscription?.pauseStartDate ? new Date(subscription.pauseStartDate).toLocaleDateString('hi-IN') : 'N/A'}`
                  : `Start Date: ${subscription?.pauseStartDate ? new Date(subscription.pauseStartDate).toLocaleDateString() : 'N/A'}`}
              </Text>
            </View>

            {/* Date Picker Button: Extend Date */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{hi ? 'नई पुनः शुरू तारीख (कैलेंडर से चुनें):' : 'New Expected Resume Date:'}</Text>
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowExtendPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={extendResumeDateObj ? "#7C3AED" : "#94A3B8"} />
              <Text style={[styles.datePickerBtnText, !extendResumeDateObj && { color: '#94A3B8', fontWeight: '500' }]}>
                {extendResumeDateObj ? formatDisplayDate(extendResumeDateObj) : (hi ? 'कैलेंडर से नई तारीख चुनें' : 'Select New Date from Calendar')}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Live 7-Day Extension Status */}
            {extendResumeDateObj ? (
              <View style={[styles.approvalRuleBox, isExtendAutoApprove ? styles.autoApproveBg : styles.adminApprovalBg]}>
                <Ionicons 
                  name={isExtendAutoApprove ? 'flash' : 'alert-circle'} 
                  size={18} 
                  color={isExtendAutoApprove ? '#059669' : '#D97706'} 
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.approvalRuleTitle, { color: isExtendAutoApprove ? '#065F46' : '#92400E' }]}>
                    {isExtendAutoApprove 
                      ? (hi ? `⚡ कुल अवधि ${totalExtendDays} दिन (स्वतः स्वीकृत)` : `⚡ Total ${totalExtendDays} Days (Auto-Approved)`)
                      : (hi ? `⚠️ कुल अवधि ${totalExtendDays} दिन (एडमिन अनुमोदन आवश्यक)` : `⚠️ Total ${totalExtendDays} Days (Admin Review Required)`)}
                  </Text>
                  <Text style={[styles.approvalRuleSub, { color: isExtendAutoApprove ? '#047857' : '#B45309' }]}>
                    {isExtendAutoApprove
                      ? (hi ? `कुल रोक ${maxAutoApproveDays} दिन के भीतर होने से तुरंत लागू होगी।` : `Total duration within ${maxAutoApproveDays} days takes effect immediately.`)
                      : (hi ? `कुल रोक ${maxAutoApproveDays} दिन से अधिक होने के कारण यह एडमिन द्वारा स्वीकृत किए जाने पर लागू होगी।` : `Total pause over ${maxAutoApproveDays} days requires admin verification.`)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.approvalRuleBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#64748B" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.approvalRuleTitle, { color: '#334155' }]}>
                    {hi ? `नियम: कुल रोक ${maxAutoApproveDays} दिन तक स्वतः स्वीकृत` : `Rule: Total pause up to ${maxAutoApproveDays} days auto-approved`}
                  </Text>
                  <Text style={[styles.approvalRuleSub, { color: '#64748B' }]}>
                    {hi ? 'कृपया ऊपर दिए गए कैलेंडर से नई समाप्ति तारीख चुनें।' : 'Please select the new resume date using the calendar above.'}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{hi ? 'अवधि बढ़ाने का कारण (वैकल्पिक):' : 'Reason for extension (optional):'}</Text>
            <TextInput
              style={styles.modalInput}
              value={extendReason}
              onChangeText={setExtendReason}
              placeholder={hi ? 'उदा. अभी भी दूध उत्पादन शुरू नहीं हुआ' : 'e.g. Need more time'}
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.modalActionBtn, (savingExtend || !extendResumeDateObj) && { opacity: extendResumeDateObj ? 0.6 : 0.85 }]}
              onPress={handleExtendService}
              disabled={savingExtend}
              activeOpacity={0.85}
            >
              {savingExtend ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionText}>
                  {!extendResumeDateObj
                    ? (hi ? 'तारीख चुनकर आगे बढ़ें' : 'Select Date to Proceed')
                    : isExtendAutoApprove 
                    ? (hi ? `रोक बढ़ाएं (${totalExtendDays} दिन स्वतः स्वीकृत)` : `Extend Pause (${totalExtendDays} Days Auto)`)
                    : (hi ? `अनुरोध भेजें (${totalExtendDays} दिन एडमिन समीक्षा)` : `Submit Request (${totalExtendDays} Days Review)`)}
                </Text>
              )}
            </TouchableOpacity>

            {showExtendPicker && (
              <DateTimePicker
                value={extendResumeDateObj || new Date((subscription?.expectedResumeDate ? new Date(subscription.expectedResumeDate).getTime() : (subscription?.pauseStartDate ? new Date(subscription.pauseStartDate).getTime() : Date.now())) + 24 * 60 * 60 * 1000)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date((subscription?.expectedResumeDate ? new Date(subscription.expectedResumeDate).getTime() : (subscription?.pauseStartDate ? new Date(subscription.pauseStartDate).getTime() : Date.now())) + 24 * 60 * 60 * 1000)}
                onChange={(event, selectedDate) => {
                  setShowExtendPicker(false);
                  if (selectedDate) {
                    setExtendResumeDateObj(selectedDate);
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>
                {hi ? 'दूध सेवा रद्द करें' : 'Cancel Milk Service'}
              </Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? 'सेवा रद्द करने से पहले कृपया रद्दीकरण समझौते को ध्यान से पढ़ें और स्वीकार करें।'
                : 'Please review and accept the cancellation agreement before terminating service.'}
            </Text>

            <View style={styles.agreementBox}>
              <Ionicons name="document-text-outline" size={20} color="#64748B" />
              <Text style={styles.agreementText}>
                {hi
                  ? 'मैं सहमत हूँ कि सेवा रद्द करने के उपरांत संकलन बंद हो जाएगा और लंबित राशि का निपटान वॉलेट संकलन नियमानुसार किया जाएगा।'
                  : 'I agree that cancellation will stop all upcoming collections. Any pending balance will settle as per KrishiNex terms.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreementChecked(!agreementChecked)}
            >
              <Ionicons
                name={agreementChecked ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreementChecked ? '#059669' : '#64748B'}
              />
              <Text style={styles.checkboxLabel}>
                {hi ? 'मैं रद्दीकरण शर्तों से सहमत हूँ।' : 'I accept the cancellation agreement.'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.modalInput, { height: 60, marginTop: 12 }]}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder={hi ? 'रद्द करने का कारण दर्ज करें...' : 'Reason for cancellation...'}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#DC2626' }, (!agreementChecked || savingCancel) && { opacity: 0.5 }]}
              onPress={handleCancelService}
              disabled={!agreementChecked || savingCancel}
            >
              {savingCancel ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionText}>{hi ? 'सेवा स्थायी रूप से रद्द करें' : 'Confirm Cancellation'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SHIFT CHANGE REQUEST MODAL */}
      <Modal visible={shiftModalVisible} transparent animationType="fade" onRequestClose={() => setShiftModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="swap-horizontal" size={18} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'दूध संकलन शिफ्ट बदलें' : 'Change Collection Shift'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShiftModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? `अपनी वर्तमान संकलन शिफ्ट (${subscription?.deliverySchedule === 'Morning and Evening' ? 'सुबह और शाम दोनों' : subscription?.deliverySchedule === 'Evening Only' ? 'केवल शाम' : 'केवल सुबह'}) से नई शिफ्ट चुनने के लिए आवेदन करें।`
                : `Request to change your active milk collection schedule from ${subscription?.deliverySchedule || 'current'}.`}
            </Text>

            <Text style={styles.fieldLabel}>{hi ? 'नई वांछित शिफ्ट चुनें:' : 'Select Desired Shift:'}</Text>
            <View style={styles.scheduleOptionsCol}>
              {/* Option 1: Morning Only */}
              <TouchableOpacity
                style={[styles.scheduleOptionCard, newSchedule === 'Morning Only' && styles.scheduleOptionCardActive]}
                onPress={() => setNewSchedule('Morning Only')}
                activeOpacity={0.8}
              >
                <View style={[styles.scheduleIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="sunny" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.scheduleTitle, newSchedule === 'Morning Only' && { color: '#059669' }]}>
                    {hi ? 'केवल सुबह (Morning Only)' : 'Morning Only'}
                  </Text>
                  <Text style={styles.scheduleSub}>{hi ? `सुबह ${morningShiftWindow}` : morningShiftWindow}</Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Morning Only' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Morning Only' ? '#059669' : '#94A3B8'}
                />
              </TouchableOpacity>

              {/* Option 2: Evening Only */}
              <TouchableOpacity
                style={[styles.scheduleOptionCard, newSchedule === 'Evening Only' && styles.scheduleOptionCardActive]}
                onPress={() => setNewSchedule('Evening Only')}
                activeOpacity={0.8}
              >
                <View style={[styles.scheduleIconCircle, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="moon" size={18} color="#6D28D9" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.scheduleTitle, newSchedule === 'Evening Only' && { color: '#059669' }]}>
                    {hi ? 'केवल शाम (Evening Only)' : 'Evening Only'}
                  </Text>
                  <Text style={styles.scheduleSub}>{hi ? `शाम ${eveningShiftWindow}` : eveningShiftWindow}</Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Evening Only' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Evening Only' ? '#059669' : '#94A3B8'}
                />
              </TouchableOpacity>

              {/* Option 3: Both Shifts */}
              <TouchableOpacity
                style={[styles.scheduleOptionCard, newSchedule === 'Morning and Evening' && styles.scheduleOptionCardActive]}
                onPress={() => setNewSchedule('Morning and Evening')}
                activeOpacity={0.8}
              >
                <View style={[styles.scheduleIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="time" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.scheduleTitle, newSchedule === 'Morning and Evening' && { color: '#059669' }]}>
                    {hi ? 'सुबह और शाम दोनों (Both Shifts)' : 'Both Shifts'}
                  </Text>
                  <Text style={styles.scheduleSub}>
                    {hi ? `सुबह (${morningShiftWindow}) • शाम (${eveningShiftWindow})` : `Morning: ${morningShiftWindow} • Evening: ${eveningShiftWindow}`}
                  </Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Morning and Evening' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Morning and Evening' ? '#059669' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{hi ? 'बदलाव का कारण (वैकल्पिक):' : 'Reason for Change (Optional):'}</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              value={shiftReason}
              onChangeText={setShiftReason}
              placeholder={hi ? 'समय में बदलाव, दुधारू पशु चक्र, आदि...' : 'Reason for changing collection schedule...'}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#059669', marginTop: 16 }, savingShiftChange && { opacity: 0.6 }]}
              onPress={handleRequestShiftChange}
              disabled={savingShiftChange}
            >
              {savingShiftChange ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionText}>{hi ? 'शिफ्ट बदलाव अनुरोध भेजें' : 'Submit Shift Request'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAILED LOG RECORD MODAL */}
      <Modal visible={!!selectedLog} transparent animationType="fade" onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text" size={18} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'दूध संकलन सम्पूर्ण विवरण' : 'Supply & Quality Details'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {/* Hero Summary Card */}
                <View style={[styles.detailHeroCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <View style={[styles.detailHeroIconCircle, { shadowColor: '#059669' }]}>
                    <Ionicons name="water" size={32} color="#059669" />
                  </View>
                  <Text style={styles.detailHeroQty}>{selectedLog.quantityLiters} L</Text>
                  <Text style={[styles.detailHeroAmount, { color: '#059669' }]}>+₹{selectedLog.totalAmount}</Text>
                  <View style={styles.detailHeroBadgeRow}>
                    <View style={styles.detailShiftPill}>
                      <Ionicons
                        name={selectedLog.shift === 'Morning' ? 'sunny-outline' : 'moon-outline'}
                        size={12}
                        color={selectedLog.shift === 'Morning' ? '#D97706' : '#4F46E5'}
                      />
                      <Text style={styles.detailShiftPillText}>
                        {selectedLog.shift === 'Morning' ? (hi ? 'सुबह की पाली' : 'Morning Shift') : (hi ? 'शाम की पाली' : 'Evening Shift')}
                      </Text>
                    </View>
                    <View style={[styles.detailStatusPill, { backgroundColor: selectedLog.status === 'Completed' ? '#D1FAE5' : '#FEF2F2' }]}>
                      <Ionicons
                        name={selectedLog.status === 'Completed' ? 'checkmark-circle' : 'alert-circle'}
                        size={12}
                        color={selectedLog.status === 'Completed' ? '#059669' : '#DC2626'}
                      />
                      <Text style={[styles.detailStatusPillText, { color: selectedLog.status === 'Completed' ? '#065F46' : '#991B1B' }]}>
                        {selectedLog.status === 'Completed' ? (hi ? 'संकलन संपन्न' : 'Collected') : selectedLog.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quality Metrics Box (FAT & SNF) */}
                <View style={styles.qualityCard}>
                  <Text style={styles.qualityCardTitle}>{hi ? 'दूध गुणवत्ता व पैमाना (Quality Metrics)' : 'Milk Quality Metrics'}</Text>
                  <View style={styles.qualityGrid}>
                    <View style={styles.qualityBox}>
                      <Text style={styles.qualityLabel}>{hi ? 'फैट (FAT)' : 'FAT'}</Text>
                      <Text style={styles.qualityValue}>
                        {selectedLog.fatPercentage !== undefined && selectedLog.fatPercentage !== null
                          ? `${selectedLog.fatPercentage}%`
                          : (hi ? 'दर्ज नहीं' : 'N/A')}
                      </Text>
                    </View>
                    <View style={styles.qualityBox}>
                      <Text style={styles.qualityLabel}>{hi ? 'एस.एन.एफ (SNF)' : 'SNF'}</Text>
                      <Text style={styles.qualityValue}>
                        {selectedLog.snfPercentage !== undefined && selectedLog.snfPercentage !== null
                          ? `${selectedLog.snfPercentage}%`
                          : (hi ? 'दर्ज नहीं' : 'N/A')}
                      </Text>
                    </View>
                    <View style={styles.qualityBox}>
                      <Text style={styles.qualityLabel}>{hi ? 'दर प्रति लीटर' : 'Rate / L'}</Text>
                      <Text style={[styles.qualityValue, { color: '#059669' }]}>₹{selectedLog.ratePerLiter}</Text>
                    </View>
                  </View>
                </View>

                {/* Information Rows */}
                <View style={styles.detailGridBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'दिनांक' : 'Date'}</Text>
                    <Text style={styles.detailRowVal}>
                      {new Date(selectedLog.date).toLocaleDateString('hi-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'समय' : 'Time'}</Text>
                    <Text style={styles.detailRowVal}>
                      {new Date(selectedLog.date).toLocaleTimeString('hi-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'आपूर्ति मात्रा' : 'Quantity Supplied'}</Text>
                    <Text style={[styles.detailRowVal, { fontWeight: '800', color: '#0F172A' }]}>
                      {selectedLog.quantityLiters} Liters
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'निर्धारित दर' : 'Applicable Rate'}</Text>
                    <Text style={styles.detailRowVal}>₹{selectedLog.ratePerLiter} / L</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'कुल संकलित राशि' : 'Total Earnings'}</Text>
                    <Text style={[styles.detailRowVal, { color: '#059669', fontWeight: '800' }]}>
                      +₹{selectedLog.totalAmount}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'निकासी स्थिति' : 'Withdrawal Status'}</Text>
                    <Text style={[styles.detailRowVal, { color: selectedLog.isProcessedInWithdrawal ? '#059669' : '#D97706', fontWeight: '700' }]}>
                      {selectedLog.isProcessedInWithdrawal
                        ? (hi ? '✓ मुख्य वॉलेट में अंतरित' : '✓ Transferred to Wallet')
                        : (hi ? '⏳ 7-दिवसीय चक्र में संचित' : '⏳ Accumulating in Cycle')}
                    </Text>
                  </View>

                  {selectedLog.performedBy ? (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailRowLabel}>{hi ? 'संकलन पार्टनर' : 'Collected By'}</Text>
                      <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Text style={[styles.detailRowVal, { fontWeight: '700' }]}>
                          {selectedLog.performedBy.name || 'Milk Partner'}
                        </Text>
                        {selectedLog.performedBy.phone && (
                          <TouchableOpacity
                            style={[styles.detailCallBtn, { backgroundColor: '#059669' }]}
                            onPress={() => Linking.openURL(`tel:${selectedLog.performedBy.phone}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={12} color="#FFFFFF" />
                            <Text style={styles.detailCallBtnText}>{selectedLog.performedBy.phone}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ) : subscription?.assignedPartnerId ? (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailRowLabel}>{hi ? 'असाइन पार्टनर' : 'Assigned Partner'}</Text>
                      <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Text style={[styles.detailRowVal, { fontWeight: '700' }]}>
                          {subscription.assignedPartnerId.name}
                        </Text>
                        {subscription.assignedPartnerId.phone && (
                          <TouchableOpacity
                            style={[styles.detailCallBtn, { backgroundColor: '#059669' }]}
                            onPress={() => Linking.openURL(`tel:${subscription.assignedPartnerId.phone}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={12} color="#FFFFFF" />
                            <Text style={styles.detailCallBtnText}>{subscription.assignedPartnerId.phone}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ) : null}

                  {selectedLog.notes ? (
                    <View style={[styles.detailRow, { borderBottomWidth: 0, alignItems: 'flex-start' }]}>
                      <Text style={styles.detailRowLabel}>{hi ? 'टिप्पणी / रिमार्क' : 'Remarks'}</Text>
                      <Text style={[styles.detailRowVal, { fontStyle: 'italic', color: '#64748B', flex: 1, textAlign: 'right' }]}>
                        {selectedLog.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#059669', marginTop: 14 }]}
                  onPress={() => setSelectedLog(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalActionText}>{hi ? 'विवरण बंद करें' : 'Close Details'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  mainWalletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  mainWalletText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pendingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  pendingDetailsBox: {
    backgroundColor: 'rgba(254, 243, 199, 0.6)',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  pendingDetailsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  pendingDetailItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  cancelRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: 6,
  },
  cancelRequestText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  pausedBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  pausedTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pausedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  pausedSubtitle: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
    fontWeight: '600',
  },
  pausedReasonText: {
    fontSize: 11,
    color: '#6D28D9',
    marginTop: 3,
    fontStyle: 'italic',
  },
  pausedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.15)',
  },
  resumeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 12,
  },
  resumeActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  extendActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  extendActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  resumeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
  },
  resumeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rolloutCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  rolloutTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  rolloutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1FAE5',
    textTransform: 'uppercase',
  },
  rolloutAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  cycleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  rolloutStatusRow: {
    marginBottom: 14,
  },
  rolloutStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  withdrawBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  withdrawBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    flexShrink: 1,
    textAlign: 'center',
  },
  rolloutFootnote: {
    fontSize: 10,
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  logShift: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logQty: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  logRate: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  logTotal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  withdrawnBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  shiftSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  shiftOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 5,
  },
  shiftOptionBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  shiftOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  shiftOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  modalActionBtn: {
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  agreementBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  agreementText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    lineHeight: 15,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  approvalRuleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 12,
  },
  autoApproveBg: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  adminApprovalBg: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  approvalRuleTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  approvalRuleSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
    fontWeight: '500',
  },
  waitingHeroCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  waitingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(253, 230, 138, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  waitingIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  waitingMainTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#78350F',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingMainDesc: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  realtimeNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
    width: '100%',
  },
  realtimeNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
    lineHeight: 16,
  },
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepperHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#059669',
  },
  stepCircleActive: {
    backgroundColor: '#D97706',
  },
  stepCircleLocked: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepConnectorLine: {
    width: 2,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  stepLineActive: {
    backgroundColor: '#059669',
  },
  stepTextContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  stepTitleDone: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  stepTitleActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  stepTitleLocked: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  stepDescActive: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
    fontWeight: '600',
  },
  appSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  appSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  appSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryGrid: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  pendingActionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  refreshStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    height: 46,
    gap: 8,
  },
  refreshStatusBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  cancelAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 46,
    gap: 8,
  },
  cancelAppBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  rejectedHeroCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    marginTop: 20,
  },
  rejectedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#991B1B',
    marginBottom: 8,
  },
  rejectedReason: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  reapplyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  reapplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancellationPendingCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  cancellationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancellationLockCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancellationTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
  },
  cancellationSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '500',
  },
  cancellationReasonBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  cancellationReasonText: {
    fontSize: 11,
    color: '#7F1D1D',
  },
  cancelledApprovedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  cancelledApprovedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#065F46',
    marginTop: 8,
    textAlign: 'center',
  },
  cancelledApprovedSub: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  newServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  newServiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lockedActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  lockedActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  partnerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  partnerSectionSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partnerNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 1,
  },
  partnerMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  partnerCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  partnerCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Shift Pending Banner
  shiftPendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  shiftPendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftPendingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftPendingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  shiftPendingSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    marginTop: 2,
  },
  shiftPendingReasonText: {
    fontSize: 10.5,
    color: '#78350F',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Section Heading Row with Count
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  filterCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  filterCountBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Premium Filter Card
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  filterActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  filterActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  filterSegmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterSegmentBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  filterSegmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterSegmentBtnTextActive: {
    color: '#FFFFFF',
  },
  filterCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  filterResetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  filterResetLinkText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  datePresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePresetPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7.5,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePresetPillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1.2,
  },
  datePresetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  datePresetPillTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  resetFilterBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignSelf: 'center',
  },
  resetFilterBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  headerMenuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionSheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetLockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
  },
  actionSheetLockedText: {
    flex: 1,
    fontSize: 12.5,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 18,
  },
  actionSheetOptionsList: {
    paddingTop: 4,
  },
  actionSheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionSheetOptionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetOptionContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 6,
  },
  actionSheetOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSheetOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },

  // Schedule Options in Modal
  scheduleOptionsCol: {
    gap: 8,
    marginTop: 8,
  },
  scheduleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  scheduleOptionCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  scheduleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  scheduleSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },

  // Quality Metrics Box
  qualityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qualityCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  qualityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qualityLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  qualityValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Detail Modal
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '94%',
    maxHeight: '85%',
  },
  detailHeroCard: {
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
  },
  detailHeroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 8,
  },
  detailHeroQty: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailHeroAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  detailHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  detailShiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailShiftPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  detailStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  detailStatusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  detailGridBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  detailRowVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  detailCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  detailCallBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

