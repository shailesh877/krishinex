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

export default function MilkBuyHistoryScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [subscription, setSubscription] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);

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
  const [newSchedule, setNewSchedule] = useState<'Morning and Evening' | 'Morning Only' | 'Evening Only'>('Morning Only');
  const [shiftReason, setShiftReason] = useState('');
  const [savingShiftChange, setSavingShiftChange] = useState(false);
  const [morningShiftWindow, setMorningShiftWindow] = useState('06:00 AM - 08:30 AM');
  const [eveningShiftWindow, setEveningShiftWindow] = useState('05:00 PM - 07:30 PM');

  // History Filter State
  const [shiftFilter, setShiftFilter] = useState<'All' | 'Morning' | 'Evening'>('All');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Selected Log Detail Modal State
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [menuModalVisible, setMenuModalVisible] = useState(false);

  useEffect(() => {
    loadData();

    let s: any = null;
    const { initSocket } = require('../../services/socket');
    initSocket().then((sock: any) => {
      s = sock;
      s?.on('milk_event', (event: any) => {
        console.log('⚡ [Buy History Realtime Event - Silent Update]:', event?.action);
        // Silent background update so UI does NOT flicker, jump, or show loading screen
        loadData(true);
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

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      await Promise.all([fetchHistory(), fetchConfig()]);
    } catch (e) {
      console.error('Fetch Buy History Error:', e);
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
      const res = await authApi.getMilkHistory('buy');
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
          setWalletBalance(res.data.walletBalance);
        }
      }
    } catch (e) {
      console.error('Fetch History Error:', e);
    }
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
          res.data.message || (hi ? 'दूध खरीद सेवा अस्थायी रूप से रोक दी गई है।' : 'Milk delivery paused.')
        );
        setPauseModalVisible(false);
        loadData();
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
        loadData();
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || 'Failed to extend pause');
    } finally {
      setSavingExtend(false);
    }
  };

  const handleResumeService = async () => {
    showAlert(
      hi ? 'डिलीवरी पुनः शुरू करें' : 'Confirm Service Resumption',
      hi ? 'क्या आप दूध डिलीवरी आज से पुनः सक्रिय करना चाहते हैं?' : 'Are you sure you want to resume milk deliveries today?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'हाँ, शुरू करें' : 'Yes, Resume',
          onPress: async () => {
            try {
              const res = await authApi.resumeMilkService(subscription._id);
              if (res.data?.success) {
                showAlert(hi ? 'सेवा पुनः सक्रिय 🎉' : 'Service Resumed 🎉', hi ? 'दूध डिलीवरी सेवा पुनः सक्रिय कर दी गई है।' : 'Delivery resumed.');
                loadData();
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
        loadData();
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
        hi ? 'आपकी वर्तमान शिफ्ट पहले से ही यही है।' : 'Selected shift is already your active shift.'
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
        loadData();
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
              ? (hi ? 'खरीद अनुरोध समीक्षाधीन' : 'Subscription Under Review')
              : (hi ? 'दूध खरीद हिस्ट्री' : 'Milk Purchase History')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {subscription?.status === 'pending'
              ? (hi ? 'प्रशासक स्वीकृति प्रतीक्षित' : 'Waiting for Admin Approval')
              : subscription
              ? `${subscription.dailyQuantityLiters} L/day • ₹${subscription.ratePerLiter || 0}/L`
              : (hi ? 'दैनिक दूध डिलीवरी' : 'Daily Milk Delivery')}
          </Text>
        </View>
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

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loaderText}>{hi ? 'लोड हो रहा है...' : 'Loading history...'}</Text>
        </View>
      ) : subscription?.status === 'pending' ? (
        /* DEDICATED WAITING FOR APPROVAL SCREEN (NOT HISTORY) */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* WAITING HERO CARD */}
          <View style={styles.waitingHeroCard}>
            <View style={styles.waitingIconRing}>
              <View style={styles.waitingIconCircle}>
                <Ionicons name="hourglass" size={38} color="#0284C7" />
              </View>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusPillText}>
                {hi ? 'समीक्षाधीन (Under Review)' : 'Pending Approval'}
              </Text>
            </View>

            <Text style={styles.waitingMainTitle}>
              {hi ? 'दूध खरीद अनुरोध समीक्षाधीन है' : 'Milk Subscription Under Review'}
            </Text>

            <Text style={styles.waitingMainDesc}>
              {hi
                ? 'आपका दूध खरीद अनुरोध KrishiNex एडमिन के पास समीक्षा व सत्यापन हेतु प्राप्त हो गया है। डिलीवरी पार्टनर असाइन होते ही व एडमिन द्वारा स्वीकृति मिलते ही आपकी सेवा स्वीकृत कर दी जाएगी और दैनिक दूध डिलीवरी हिस्ट्री सक्रिय हो जाएगी।'
                : 'Your milk purchase subscription is under admin review. Once approved and delivery partner is assigned, your daily delivery history will unlock automatically.'}
            </Text>

            {/* REALTIME SOCKET NOTICE */}
            <View style={styles.realtimeNoticeBox}>
              <Ionicons name="flash" size={16} color="#0284C7" />
              <Text style={styles.realtimeNoticeText}>
                {hi
                  ? '⚡ रियल-टाइम सिंक सक्रिय: एडमिन द्वारा स्वीकृति मिलते ही यह स्क्रीन तुरंत स्वतः सक्रिय हो जाएगी (पेज रिफ्रेश करने की आवश्यकता नहीं)।'
                  : '⚡ Real-time Sync: Screen will unlock automatically as soon as admin approves (No refresh needed).'}
              </Text>
            </View>
          </View>

          {/* 3-STEP PROGRESS STEPPER */}
          <View style={styles.stepperContainer}>
            <Text style={styles.stepperHeaderTitle}>
              {hi ? 'सदस्यता प्रगति स्थिति' : 'Subscription Progress'}
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
                <Text style={styles.stepTitleDone}>{hi ? '1. खरीद अनुरोध दर्ज' : '1. Subscription Submitted'}</Text>
                <Text style={styles.stepDesc}>
                  {subscription?.createdAt
                    ? (hi ? `दिनांक: ${new Date(subscription.createdAt).toLocaleDateString('hi-IN')}` : `Date: ${new Date(subscription.createdAt).toLocaleDateString()}`)
                    : (hi ? 'सफलतापूर्वक सबमिट' : 'Submitted successfully')}
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
                  {hi ? '2. एडमिन समीक्षा व पार्टनर आवंटन' : '2. Review & Partner Assignment'}
                </Text>
                <Text style={styles.stepDescActive}>
                  {hi ? '⏳ वर्तमान स्थिति: डिलीवरी रूट व पार्टनर सत्यापन जारी...' : '⏳ Current Status: Route & partner verification in progress...'}
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
                  {hi ? '3. दैनिक डिलीवरी हिस्ट्री अनलॉक' : '3. Delivery History Active'}
                </Text>
                <Text style={styles.stepDesc}>
                  {hi ? '🔒 स्वीकृति के बाद दैनिक दूध डिलीवरी व वॉलेट स्वचालित डेबिट रिकॉर्ड दिखेगा।' : '🔒 Unlocks daily delivery logs and auto-debit records once approved.'}
                </Text>
              </View>
            </View>
          </View>

          {/* APPLICATION DETAILS CARD */}
          <View style={styles.appSummaryCard}>
            <View style={styles.appSummaryHeader}>
              <Ionicons name="document-text-outline" size={18} color="#0284C7" />
              <Text style={styles.appSummaryTitle}>
                {hi ? 'सदस्यता सारांश' : 'Subscription Summary'}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'दैनिक आवश्यकता:' : 'Daily Required:'}</Text>
                <Text style={styles.summaryValue}>{subscription.dailyQuantityLiters} L / दिन</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'डिलीवरी पता:' : 'Delivery Address:'}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{subscription.address}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'दर प्रति लीटर:' : 'Rate/Liter:'}</Text>
                <Text style={[styles.summaryValue, { color: '#0284C7', fontWeight: '800' }]}>
                  ₹{subscription.ratePerLiter || 0}/L
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
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'अनुरोध दिनांक:' : 'Request Date:'}</Text>
                <Text style={styles.summaryValue}>
                  {subscription?.createdAt ? new Date(subscription.createdAt).toLocaleDateString('hi-IN') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* ACTIONS: REFRESH & CANCEL */}
          <View style={styles.pendingActionsContainer}>
            <TouchableOpacity
              style={styles.refreshStatusBtn}
              onPress={() => { setRefreshing(true); loadData(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#0284C7" />
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
                {hi ? 'अनुरोध रद्द करें' : 'Cancel Subscription'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isCancellationPending ? (
        /* DEDICATED WAITING FOR CANCELLATION APPROVAL SCREEN */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
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
              {hi ? 'खरीद रद्दीकरण अर्जी प्रक्रिया में है' : 'Subscription Cancellation Under Admin Review'}
            </Text>

            <Text style={[styles.waitingMainDesc, { color: '#991B1B' }]}>
              {hi
                ? 'आपने अपनी दूध खरीद सदस्यता स्थायी रूप से रद्द करने की अर्जी दी है। एडमिन द्वारा स्वीकृति दिए जाने तक दूध डिलीवरी व सेवाएं रोक दी गई हैं।'
                : 'You have requested to cancel your milk purchase subscription. Services and deliveries remain locked pending admin review.'}
            </Text>

            {/* REALTIME SOCKET NOTICE */}
            <View style={[styles.realtimeNoticeBox, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
              <Ionicons name="flash" size={16} color="#E11D48" />
              <Text style={[styles.realtimeNoticeText, { color: '#9F1239' }]}>
                {hi
                  ? '⚡ रियल-टाइम सिंक सक्रिय: एडमिन द्वारा रद्दीकरण स्वीकार होते ही यह स्क्रीन स्वतः नई सेवा चुनने हेतु खुल जाएगी।'
                  : '⚡ Real-time Sync: Screen will unlock for a new subscription automatically upon admin acceptance.'}
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
                <Text style={styles.summaryLabel}>{hi ? 'दैनिक दूध मात्रा:' : 'Daily Required:'}</Text>
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
              onPress={() => { setRefreshing(true); loadData(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#0284C7" />
              <Text style={styles.refreshStatusBtnText}>
                {hi ? 'स्थिति रिफ्रेश करें' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : subscription?.status === 'rejected' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          <View style={styles.rejectedHeroCard}>
            <View style={styles.rejectedIconCircle}>
              <Ionicons name="close-circle" size={44} color="#DC2626" />
            </View>
            <Text style={styles.rejectedTitle}>
              {hi ? 'अनुरोध अस्वीकृत (Subscription Rejected)' : 'Subscription Rejected'}
            </Text>
            <Text style={styles.rejectedReason}>
              {subscription.rejectionReason || (hi ? 'प्रशासनिक कारणों से आपका अनुरोध अस्वीकृत किया गया है।' : 'Your request was rejected by admin.')}
            </Text>
            <TouchableOpacity
              style={styles.reapplyBtn}
              onPress={() => router.replace({ pathname: '/milk/register', params: { type: 'buy' } })}
            >
              <Text style={styles.reapplyBtnText}>{hi ? 'पुनः आवेदन करें' : 'Apply Again'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : !subscription || subscription?.status === 'cancelled' ? (
        <View style={styles.loaderCenter}>
          <Ionicons name="water-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>{hi ? 'कोई सक्रिय दूध खरीद सेवा नहीं है।' : 'No active milk purchase subscription.'}</Text>
          <TouchableOpacity
            style={[styles.reapplyBtn, { marginTop: 16 }]}
            onPress={() => router.replace('/milk')}
          >
            <Text style={styles.reapplyBtnText}>{hi ? 'दूध खरीद शुरू करें' : 'Start Milk Subscription'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* APPROVED OR PAUSED: ACTIVE HISTORY SCREEN */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
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
                      : (hi ? 'डिलीवरी अस्थायी रूप से रुकी हुई है' : 'Deliveries Temporarily Paused')}
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
                  <Text style={styles.resumeActionBtnText}>{hi ? 'डिलीवरी पुनः शुरू करें' : 'Resume Deliveries'}</Text>
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

          {/* MAIN WALLET AUTO-DEBIT CARD */}
          <LinearGradient
            colors={['#0284C7', '#0369A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletInfoCard}
          >
            <View style={styles.walletTopRow}>
              <View>
                <Text style={styles.walletNoticeTitle}>
                  {hi ? 'मुख्य वॉलेट स्वचालित डेबिट' : 'Main Wallet Auto-Debit'}
                </Text>
                <Text style={styles.walletBalanceText}>₹{walletBalance}</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/wallet')}
                style={styles.rechargeBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={16} color="#0284C7" />
                <Text style={styles.rechargeBtnText}>{hi ? 'रिचार्ज करें' : 'Top Up'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.walletNoticeFooter}>
              <Ionicons name="checkmark-circle" size={14} color="#BAE6FD" />
              <Text style={styles.walletNoticeSub}>
                {hi
                  ? 'दैनिक दूध प्राप्त होते ही राशि सीधे आपके मुख्य कृषि नेक्स वॉलेट से डेबिट होती है।'
                  : 'Daily delivery charge is automatically debited from your main KrishiNex wallet.'}
              </Text>
            </View>
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
                      ? 'आपने अपनी दूध खरीद सेवा स्थायी रूप से रद्द करने की अर्जी दी है। एडमिन द्वारा अर्जी स्वीकृत किए जाने तक सेवाएं लॉक रहेंगी।'
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

          {/* SERVICE CONTROLS */}
          {isCancellationPending ? (
            <View style={styles.lockedActionBox}>
              <Ionicons name="lock-closed" size={16} color="#DC2626" />
              <Text style={styles.lockedActionText}>
                {hi
                  ? 'रद्दीकरण अर्जी समीक्षा में होने के कारण सेवाएं लॉक हैं।'
                  : 'Actions are locked pending permanent cancellation review.'}
              </Text>
            </View>
          ) : !isCancelledApproved ? (
            <>
              {/* SHIFT CHANGE PENDING BANNER */}
              {isShiftChangePending && (
                <View style={styles.shiftPendingCard}>
                  <View style={styles.shiftPendingHeader}>
                    <View style={styles.shiftPendingIconCircle}>
                      <Ionicons name="swap-horizontal" size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.shiftPendingTitle}>
                        {hi ? 'शिफ्ट बदलाव अनुरोध समीक्षाधीन है' : 'Shift Change Pending Approval'}
                      </Text>
                      <Text style={styles.shiftPendingSub}>
                        {hi
                          ? `अनुरोध: ${subscription?.requestedDeliverySchedule || 'N/A'}`
                          : `Requested: ${subscription?.requestedDeliverySchedule || 'N/A'}`}
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
              <Ionicons name="receipt-outline" size={18} color="#0284C7" />
              <Text style={styles.sectionHeading}>{hi ? 'तारीख-वार दूध प्राप्ति रिकॉर्ड' : 'Delivery & Payment Records'}</Text>
            </View>
            <View style={styles.filterCountBadgeContainer}>
              <Text style={styles.filterCountBadge}>
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
                <Text style={styles.filterSectionTitle}>{hi ? 'डिलीवरी शिफ्ट' : 'DELIVERY SHIFT'}</Text>
              </View>
              {shiftFilter !== 'All' && (
                <View style={styles.filterActiveBadge}>
                  <Text style={styles.filterActiveBadgeText}>
                    {shiftFilter === 'Morning' ? (hi ? 'सुबह सक्रिय' : 'Morning Active') : (hi ? 'शाम सक्रिय' : 'Evening Active')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.filterSegmentedRow}>
              <TouchableOpacity
                style={[styles.filterSegmentBtn, shiftFilter === 'All' && styles.filterSegmentBtnActive]}
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
                style={[styles.filterSegmentBtn, shiftFilter === 'Morning' && styles.filterSegmentBtnActive]}
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
                style={[styles.filterSegmentBtn, shiftFilter === 'Evening' && styles.filterSegmentBtnActive]}
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
                  style={styles.filterResetLink}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={11} color="#0284C7" />
                  <Text style={styles.filterResetLinkText}>{hi ? 'रीसेट करें' : 'Reset'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.datePresetsRow}>
              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'all' && styles.datePresetPillActive]}
                onPress={() => setDatePreset('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'all' && styles.datePresetPillTextActive]}>
                  {hi ? 'पूरा इतिहास' : 'All Time'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'today' && styles.datePresetPillActive]}
                onPress={() => setDatePreset('today')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'today' && styles.datePresetPillTextActive]}>
                  {hi ? 'आज' : 'Today'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'week' && styles.datePresetPillActive]}
                onPress={() => setDatePreset('week')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'week' && styles.datePresetPillTextActive]}>
                  {hi ? 'इस हफ्ते' : 'This Week'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetPill, datePreset === 'month' && styles.datePresetPillActive]}
                onPress={() => setDatePreset('month')}
                activeOpacity={0.75}
              >
                <Text style={[styles.datePresetPillText, datePreset === 'month' && styles.datePresetPillTextActive]}>
                  {hi ? 'इस महीने' : 'This Month'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {logs.length === 0
                  ? (hi ? 'अभी तक कोई डिलीवरी रिकॉर्ड नहीं है।' : 'No delivery records yet.')
                  : (hi ? 'चयनित फ़िल्टर अनुसार कोई रिकॉर्ड नहीं मिला।' : 'No records match selected filter.')}
              </Text>
              {logs.length > 0 && (shiftFilter !== 'All' || datePreset !== 'all') && (
                <TouchableOpacity
                  onPress={() => {
                    setShiftFilter('All');
                    setDatePreset('all');
                  }}
                  style={styles.resetFilterBtn}
                >
                  <Text style={styles.resetFilterBtnText}>{hi ? 'फ़िल्टर हटाएं (Reset)' : 'Reset Filters'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredLogs.map(log => {
              const logDate = new Date(log.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const logTime = new Date(log.date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={log._id}
                  style={styles.logCard}
                  onPress={() => setSelectedLog(log)}
                  activeOpacity={0.75}
                >
                  <View style={styles.logLeft}>
                    <View style={styles.deliveryIconBox}>
                      <Ionicons name="water" size={18} color="#0284C7" />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.logDate}>{logDate}</Text>
                      <Text style={styles.logTime}>
                        {log.shift === 'Morning' ? (hi ? 'सुबह' : 'Morning') : (hi ? 'शाम' : 'Evening')} • {logTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    <Text style={styles.logQty}>{log.quantityLiters} L</Text>
                    <Text style={styles.logRate}>@ ₹{log.ratePerLiter}/L</Text>
                    <Text style={styles.debitAmount}>-₹{log.totalAmount}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.debitStatusText}>
                        <Ionicons name="checkmark-done" size={11} color="#059669" /> {hi ? 'वॉलेट डेबिट' : 'Debited'}
                      </Text>
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
                  {hi ? 'सेवा प्रबंधन विकल्प' : 'Service Options'}
                </Text>
                <Text style={styles.actionSheetSub}>
                  {subscription?.status === 'paused'
                    ? (hi ? 'वर्तमान स्थिति: डिलीवरी अस्थायी रुकी हुई' : 'Status: Currently Paused')
                    : (hi ? 'वर्तमान स्थिति: सक्रिय डिलीवरी सेवा' : 'Status: Active Subscription')}
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
                        {hi ? 'डिलीवरी पुनः शुरू करें (Resume)' : 'Resume Deliveries'}
                      </Text>
                      <Text style={styles.actionSheetOptionSub}>
                        {hi ? 'अस्थायी रोक समाप्त कर नियमित डिलीवरी शुरू करें' : 'End temporary pause and restart deliveries'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionSheetOptionItem}
                    onPress={() => {
                      setMenuModalVisible(false);
                      const d = new Date();
                      d.setHours(0, 0, 0, 0);
                      d.setDate(d.getDate() + minAdvanceDays);
                      setStartDateObj(d);
                      setResumeDateObj(null);
                      setPauseReason('');
                      setPauseShift('Both');
                      setPauseModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionSheetOptionIconCircle, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="pause" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.actionSheetOptionContent}>
                      <Text style={[styles.actionSheetOptionTitle, { color: '#0F172A' }]}>
                        {hi ? 'डिलीवरी अस्थायी रोकें (Pause)' : 'Pause Deliveries'}
                      </Text>
                      <Text style={styles.actionSheetOptionSub}>
                        {hi ? 'छुट्टी या यात्रा के दिनों के लिए अग्रिम में डिलीवरी रोकें' : 'Temporarily pause deliveries for upcoming dates'}
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
                      {hi ? 'डिलीवरी शिफ्ट बदलें' : 'Change Delivery Shift'}
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
                      {hi ? 'सेवा स्थायी रूप से रद्द करें' : 'Cancel Subscription'}
                    </Text>
                    <Text style={styles.actionSheetOptionSub}>
                      {hi ? 'दूध खरीद सेवा स्थायी रूप से समाप्त करने की अर्जी दें' : 'Submit request to permanently stop milk service'}
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
                <Text style={styles.modalTitle}>{hi ? 'डिलीवरी अस्थायी रूप से रोकें' : 'Pause Milk Deliveries'}</Text>
              </View>
              <TouchableOpacity onPress={() => setPauseModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? 'यदि आप कुछ दिनों के लिए बाहर जा रहे हैं, तो डिलीवरी रोक सकते हैं।'
                : 'Pause daily milk deliveries temporarily. You can modify resumption dates anytime.'}
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
                      ? (hi ? `${maxAutoApproveDays} दिन या कम की रोक आवेदन करते ही स्वतः प्रभावी हो जाएगी।` : `Pauses up to ${maxAutoApproveDays} days are approved automatically without delay.`)
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
              placeholder={hi ? 'उदा. शहर से बाहर जा रहे हैं' : 'e.g. Traveling or out of town'}
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
                    ? (hi ? `डिलीवरी रोकें (${pauseDurationDays} दिन स्वतः स्वीकृत)` : `Confirm Pause (${pauseDurationDays} Days Auto)`)
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
              placeholder={hi ? 'उदा. अभी भी शहर से बाहर हैं' : 'e.g. Need more days'}
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
                {hi ? 'दूध खरीद सेवा रद्द करें' : 'Cancel Subscription'}
              </Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? 'सदस्यता रद्द करने पर कल से दूध डिलीवरी स्थायी रूप से बंद कर दी जाएगी।'
                : 'Cancelling will permanently stop future milk deliveries.'}
            </Text>

            <View style={styles.agreementBox}>
              <Ionicons name="document-text-outline" size={20} color="#64748B" />
              <Text style={styles.agreementText}>
                {hi
                  ? 'मैं सहमत हूँ कि सेवा रद्द करने के बाद दूध डिलीवरी बंद हो जाएगी। वॉलेट में बची शेष राशि पूर्णतः सुरक्षित रहेगी।'
                  : 'I agree to terminate daily deliveries. Remaining wallet balance remains untouched.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreementChecked(!agreementChecked)}
            >
              <Ionicons
                name={agreementChecked ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreementChecked ? '#0284C7' : '#64748B'}
              />
              <Text style={styles.checkboxLabel}>
                {hi ? 'मैं रद्दीकरण शर्तों से सहमत हूँ।' : 'I accept cancellation terms.'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.modalInput, { height: 60, marginTop: 12 }]}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder={hi ? 'रद्द करने का कारण...' : 'Reason for cancellation...'}
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
                <Text style={styles.modalActionText}>{hi ? 'सदस्यता रद्द करें' : 'Confirm Cancellation'}</Text>
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
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="swap-horizontal" size={18} color="#0284C7" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'दूध डिलीवरी शिफ्ट बदलें' : 'Change Delivery Shift'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShiftModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {hi
                ? `अपनी वर्तमान डिलीवरी शिफ्ट (${subscription?.deliverySchedule === 'Morning and Evening' ? 'सुबह और शाम दोनों' : subscription?.deliverySchedule === 'Evening Only' ? 'केवल शाम' : 'केवल सुबह'}) से नई शिफ्ट चुनने के लिए आवेदन करें।`
                : `Request to change your active delivery schedule from ${subscription?.deliverySchedule || 'current'}.`}
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
                  <Text style={[styles.scheduleTitle, newSchedule === 'Morning Only' && { color: '#0284C7' }]}>
                    {hi ? 'केवल सुबह (Morning Only)' : 'Morning Only'}
                  </Text>
                  <Text style={styles.scheduleSub}>{hi ? `सुबह ${morningShiftWindow}` : morningShiftWindow}</Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Morning Only' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Morning Only' ? '#0284C7' : '#94A3B8'}
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
                  <Text style={[styles.scheduleTitle, newSchedule === 'Evening Only' && { color: '#0284C7' }]}>
                    {hi ? 'केवल शाम (Evening Only)' : 'Evening Only'}
                  </Text>
                  <Text style={styles.scheduleSub}>{hi ? `शाम ${eveningShiftWindow}` : eveningShiftWindow}</Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Evening Only' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Evening Only' ? '#0284C7' : '#94A3B8'}
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
                  <Text style={[styles.scheduleTitle, newSchedule === 'Morning and Evening' && { color: '#0284C7' }]}>
                    {hi ? 'सुबह और शाम दोनों (Both Shifts)' : 'Both Shifts'}
                  </Text>
                  <Text style={styles.scheduleSub}>
                    {hi ? `सुबह (${morningShiftWindow}) • शाम (${eveningShiftWindow})` : `Morning: ${morningShiftWindow} • Evening: ${eveningShiftWindow}`}
                  </Text>
                </View>
                <Ionicons
                  name={newSchedule === 'Morning and Evening' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={newSchedule === 'Morning and Evening' ? '#0284C7' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{hi ? 'बदलाव का कारण (वैकल्पिक):' : 'Reason for Change (Optional):'}</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              value={shiftReason}
              onChangeText={setShiftReason}
              placeholder={hi ? 'समय में बदलाव, घर में आवश्यकता, आदि...' : 'Reason for changing delivery schedule...'}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#0284C7', marginTop: 16 }, savingShiftChange && { opacity: 0.6 }]}
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
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text" size={18} color="#0284C7" />
                </View>
                <Text style={styles.modalTitle}>{hi ? 'दूध डिलीवरी सम्पूर्ण विवरण' : 'Delivery Details'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {/* Hero Summary Card */}
                <View style={styles.detailHeroCard}>
                  <View style={styles.detailHeroIconCircle}>
                    <Ionicons name="water" size={32} color="#0284C7" />
                  </View>
                  <Text style={styles.detailHeroQty}>{selectedLog.quantityLiters} L</Text>
                  <Text style={styles.detailHeroAmount}>-₹{selectedLog.totalAmount}</Text>
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
                    <View style={[styles.detailStatusPill, { backgroundColor: selectedLog.status === 'Completed' ? '#ECFDF5' : '#FEF2F2' }]}>
                      <Ionicons
                        name={selectedLog.status === 'Completed' ? 'checkmark-circle' : 'alert-circle'}
                        size={12}
                        color={selectedLog.status === 'Completed' ? '#059669' : '#DC2626'}
                      />
                      <Text style={[styles.detailStatusPillText, { color: selectedLog.status === 'Completed' ? '#065F46' : '#991B1B' }]}>
                        {selectedLog.status === 'Completed' ? (hi ? 'सफलतापूर्वक प्राप्त' : 'Delivered') : selectedLog.status}
                      </Text>
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
                    <Text style={styles.detailRowLabel}>{hi ? 'मात्रा' : 'Quantity'}</Text>
                    <Text style={[styles.detailRowVal, { fontWeight: '800', color: '#0F172A' }]}>
                      {selectedLog.quantityLiters} Liters
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'दूध दर' : 'Rate / Liter'}</Text>
                    <Text style={styles.detailRowVal}>₹{selectedLog.ratePerLiter} / L</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'कुल कटौती' : 'Total Amount'}</Text>
                    <Text style={[styles.detailRowVal, { color: '#DC2626', fontWeight: '800' }]}>
                      -₹{selectedLog.totalAmount}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{hi ? 'भुगतान स्थिति' : 'Payment Status'}</Text>
                    <Text style={[styles.detailRowVal, { color: '#059669', fontWeight: '700' }]}>
                      {hi ? '✓ मुख्य वॉलेट से डेबिट' : '✓ Debited from Wallet'}
                    </Text>
                  </View>

                  {selectedLog.debitTransactionId ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>{hi ? 'ट्रांजेक्शन आईडी' : 'Transaction Ref'}</Text>
                      <Text style={[styles.detailRowVal, { fontSize: 11, color: '#64748B' }]}>
                        {selectedLog.debitTransactionId}
                      </Text>
                    </View>
                  ) : null}

                  {selectedLog.performedBy ? (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailRowLabel}>{hi ? 'मिल्क पार्टनर' : 'Delivered By'}</Text>
                      <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Text style={[styles.detailRowVal, { fontWeight: '700' }]}>
                          {selectedLog.performedBy.name || 'Milk Partner'}
                        </Text>
                        {selectedLog.performedBy.phone && (
                          <TouchableOpacity
                            style={styles.detailCallBtn}
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
                            style={styles.detailCallBtn}
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
                    <View style={[styles.detailRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
                      <Text style={[styles.detailRowLabel, { marginBottom: 4 }]}>{hi ? 'टिप्पणी / नोट्स:' : 'Notes:'}</Text>
                      <Text style={[styles.detailRowVal, { textAlign: 'left', color: '#475569' }]}>
                        {selectedLog.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#F1F5F9', marginTop: 14 }]}
                  onPress={() => setSelectedLog(null)}
                >
                  <Text style={[styles.modalActionText, { color: '#334155' }]}>{hi ? 'बंद करें' : 'Close'}</Text>
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
    backgroundColor: '#0284C7',
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
  walletInfoCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  walletNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BAE6FD',
    textTransform: 'uppercase',
  },
  walletBalanceText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rechargeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  walletNoticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  walletNoticeSub: {
    flex: 1,
    fontSize: 10,
    color: '#E0F2FE',
    fontWeight: '500',
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  actionBtnPrimary: {
    flex: 1.2,
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
  deliveryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  logTime: {
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
  debitAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  debitStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
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
    backgroundColor: '#0284C7',
    borderColor: '#0369A1',
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
    backgroundColor: '#0284C7',
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
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  waitingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(186, 230, 253, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  waitingIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  waitingMainTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0C4A6E',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingMainDesc: {
    fontSize: 12,
    color: '#0369A1',
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
    backgroundColor: '#0284C7',
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
    color: '#0284C7',
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
    color: '#0369A1',
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    height: 46,
    gap: 8,
  },
  refreshStatusBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
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
    backgroundColor: '#0284C7',
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
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0284C7',
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

  // Shift Change Banner
  shiftPendingCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
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
  filterCountBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  filterActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
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
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  filterResetLinkText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
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
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1.2,
  },
  datePresetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  datePresetPillTextActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  resetFilterBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignSelf: 'center',
  },
  resetFilterBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
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
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
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
    backgroundColor: '#F0F9FF',
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  detailHeroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0284C7',
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
    color: '#DC2626',
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
    backgroundColor: '#0284C7',
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
});