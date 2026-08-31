// app/(labour-partner)/bookings.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}`;

type BookingStatus = 'new' | 'accepted' | 'completed';

type BookingItem = {
  id: string;
  farmerName: string;
  farmerPhone: string;
  workType: string;
  village: string;
  distanceKm: number;
  dateLabel: string;
  offerRate: string;
  status: BookingStatus;
  platformCommission?: number;
  ownerPayout?: number;
  priceType?: string;
  hours?: number;
  days?: number;
  fromDate?: string;
  toDate?: string;
  paymentMode?: string;
  purpose?: string;
};

const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: '1',
    farmerName: 'Ram Singh',
    farmerPhone: '+91 98765 11111',
    workType: 'Wheat cutting',
    village: 'Rampur',
    distanceKm: 4.2,
    dateLabel: 'Today • 2:30 PM',
    offerRate: '₹ 750 / day per person',
    status: 'new',
  },
  {
    id: '2',
    farmerName: 'Sohan Lal',
    farmerPhone: '+91 98765 22222',
    workType: 'Spraying (pesticide)',
    village: 'Bhagwanpur',
    distanceKm: 7.8,
    dateLabel: 'Today • 11:00 AM',
    offerRate: '₹ 120 / hour',
    status: 'accepted',
  },
  {
    id: '3',
    farmerName: 'Mahesh',
    farmerPhone: '+91 98765 33333',
    workType: 'Field cleaning',
    village: 'Deoria',
    distanceKm: 3.5,
    dateLabel: 'Yesterday • 4:15 PM',
    offerRate: '₹ 700 / day per person',
    status: 'completed',
  },
];

export default function LabourBookingsScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<BookingStatus>('new');
  // Initialize as empty now
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpJobId, setOtpJobId] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/labour/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Filter raw data first to ensure we only map valid bookings
        const validData = data.filter((b: any) =>
          b.assignedStatus !== 'remove' && b.assignedStatus !== 'cancelled'
        );

        // Map backend orders to our BookingItem shape
        const mapped: BookingItem[] = validData.map((b: any) => ({
          id: b._id,
          farmerName: b.buyer?.name || 'Unknown Farmer',
          farmerPhone: b.buyer?.phone || '+91 -',
          workType: b.crop || 'Field Work', // using crop as workType for now
          village: b.location || b.buyer?.address || 'Unknown Village',
          distanceKm: 0, // Not explicitly returning distance yet
          dateLabel: b.fromDate ? new Date(b.fromDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(b.createdAt).toLocaleDateString(),
          offerRate: b.priceType === 'hourly' ? `₹ ${b.amount / (b.hours || 1)} / hour` : `₹ ${b.amount / (b.days || 1)} / day`,
          // Map backend: 'new' -> 'new', 'ok' -> 'accepted', 'completed' -> 'completed'
          status: b.assignedStatus === 'ok' ? 'accepted' :
            (b.assignedStatus === 'completed' || b.assignedStatus === 'delivered') ? 'completed' :
              'new',
          platformCommission: b.platformCommission || 0,
          ownerPayout: b.ownerPayout || 0,
          priceType: b.priceType,
          hours: b.hours,
          days: b.days,
          fromDate: b.fromDate,
          toDate: b.toDate,
          paymentMode: b.paymentMode,
          purpose: b.purpose
        }));
        setBookings(mapped);
      }
    } catch (e) {
      console.error('Fetch bookings error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const filtered = bookings.filter(b => b.status === tab);

  const updateBookingStatus = async (id: string, status: BookingStatus | 'remove', otp?: string) => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
         const user = JSON.parse(userDataStr);
         if (user.status !== 'approved') {
            showAlert(
              isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
              isHindi ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप यह कार्रवाई नहीं कर सकते।' : 'Profile not verified. You cannot perform this action.'
            );
            return;
         }
      }

      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/labour/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, otp })
      });
      const resData = await res.json();
      if (res.ok) {
        setBookings(prev =>
          status === 'remove'
            ? prev.filter(b => b.id !== id)
            : prev.map(b => (b.id === id ? { ...b, status: status as BookingStatus } : b)),
        );
        if (status === 'completed') {
          showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'काम पूरा हो गया और पैसे आपके वॉलेट में आ गए!' : 'Job completed and amount added to your wallet!');
        }
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', resData.error || (isHindi ? 'स्टेटस अपडेट करने में विफल' : 'Failed to update status'));
        console.error('Failed to update status on server:', resData);
      }
    } catch (e) {
      console.error('Status update error', e);
      showAlert(isHindi ? 'त्रुटi' : 'Error', isHindi ? 'सर्वर कनेक्शन विफल' : 'Server connection failed');
    }
  };

  const handleMarkComplete = (id: string) => {
    // We'll use a simple prompt for OTP. If it's android, we might need a custom modal, 
    // but React Native's standard Alert doesn't support Input on Android easily.
    // However, I'll use a simple logic here. 
    // Since I cannot easily add a full Modal without big changes, I'll use Alert.prompt for iOS 
    // and for Android I'll just explain. 
    // Actually, I'll add a simple input modal state.
    setOtpJobId(id);
    setShowOtpModal(true);
  };

  const getStatusChip = (status: BookingStatus) => {
    if (status === 'new') {
      return {
        bg: '#DBEAFE',
        color: '#1D4ED8',
        icon: 'sparkles-outline' as const,
        label: isHindi ? 'नया आया काम' : 'New work',
      };
    }
    if (status === 'accepted') {
      return {
        bg: '#FEF3C7',
        color: '#B45309',
        icon: 'time-outline' as const,
        label: isHindi ? 'काम fix हो गया' : 'Job fixed',
      };
    }
    return {
      bg: '#DCFCE7',
      color: '#15803D',
      icon: 'checkmark-circle-outline' as const,
      label: isHindi ? 'काम पूरा हो चुका' : 'Work completed',
    };
  };

  const renderBooking = ({ item }: { item: BookingItem }) => {
    const chip = getStatusChip(item.status);

    return (
      <View style={styles.card}>
        {/* top row: name + status */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.cardTitle}>{item.farmerName}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.farmerPhone}`)}>
                <Text style={[styles.phoneText, { color: '#16A34A', fontWeight: '700', textDecorationLine: 'underline' }]}>
                  {item.farmerPhone}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.workRow}>
              <Ionicons name="hammer-outline" size={13} color="#6B7280" />
              <Text style={styles.workText}>{item.workType}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusChip,
              { backgroundColor: chip.bg },
            ]}
          >
            <Ionicons name={chip.icon} size={13} color={chip.color} />
            <Text
              style={[
                styles.statusChipText,
                { color: chip.color },
              ]}
            >
              {chip.label}
            </Text>
          </View>
        </View>

        {/* middle row: village + distance + date */}
        <View style={styles.cardMiddleRow}>
          <View style={styles.locationWrap}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.cardSubText}>
              {item.village}
            </Text>
          </View>
          <View style={styles.dateWrap}>
            <Ionicons name="calendar-outline" size={13} color="#6B7280" />
            <Text style={styles.cardSubText}>{item.dateLabel}</Text>
          </View>
        </View>

        {/* New Details Row: Payment + Duration */}
        <View style={styles.detailsBox}>
           <View style={styles.detailItem}>
             <Ionicons name="wallet-outline" size={12} color="#4B5563" />
             <Text style={styles.detailText}>
               {lang === 'hi' ? 'भुगतान:' : 'Payment:'} {item.paymentMode === 'WALLET' ? (lang === 'hi' ? 'वॉलेट' : 'Wallet') : (lang === 'hi' ? 'नकद' : 'Cash')}
             </Text>
           </View>
           <View style={styles.detailItem}>
             <Ionicons name="time-outline" size={12} color="#4B5563" />
             <Text style={styles.detailText}>
               {item.priceType === 'hourly' 
                 ? `${item.hours || 0} ${lang === 'hi' ? 'घंटे' : 'Hours'}` 
                 : `${item.days || 0} ${lang === 'hi' ? 'दिन' : 'Days'}`}
             </Text>
           </View>
        </View>

        {item.purpose ? (
          <View style={styles.purposeBox}>
            <Text style={styles.purposeLabel}>{lang === 'hi' ? 'उद्देश्य:' : 'Purpose:'}</Text>
            <Text style={styles.purposeText} numberOfLines={2}>{item.purpose}</Text>
          </View>
        ) : null}

        {/* bottom row: rate + buttons */}
        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.rateText}>{item.offerRate}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>- ₹{(item.platformCommission || 0).toLocaleString()}</Text>
              <Text style={{ fontSize: 9, color: '#6B7280', marginLeft: 4 }}>{lang === 'hi' ? 'एडमिन कमीशन' : 'Admin Commission'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#059669' }}>₹{(item.ownerPayout || 0).toLocaleString()}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669', marginLeft: 4 }}>{lang === 'hi' ? 'आपका भुगतान' : 'Net Payout'}</Text>
            </View>
          </View>

          {tab === 'new' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.rejectBtn]}
                activeOpacity={0.8}
                onPress={() => updateBookingStatus(item.id, 'remove')}
              >
                <Ionicons name="close-outline" size={14} color="#B91C1C" />
                <Text style={[styles.smallBtnText, { color: '#B91C1C' }]}>
                  {isHindi ? 'Cancel' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, styles.acceptBtn]}
                activeOpacity={0.8}
                onPress={() => updateBookingStatus(item.id, 'accepted')}
              >
                <Ionicons name="checkmark-outline" size={14} color="#FFFFFF" />
                <Text style={[styles.smallBtnText, { color: '#FFFFFF' }]}>
                  {isHindi ? 'Accept' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === 'accepted' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.completeBtn]}
                activeOpacity={0.8}
                onPress={() => handleMarkComplete(item.id)}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={[styles.smallBtnText, { color: '#FFFFFF' }]}>
                  {isHindi ? 'OTP डालिये' : 'Enter OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === 'completed' && null}
        </View>
      </View>
    );
  };

  const tabLabel = (key: BookingStatus) => {
    if (key === 'new') return isHindi ? 'नया' : 'New';
    if (key === 'accepted') return isHindi ? 'Accepted' : 'Accepted';
    return isHindi ? 'Completed' : 'Completed';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER SIMPLE */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'मेरे खेतों के काम' : 'My field jobs'}
          </Text>
          <Text style={styles.headerSub}>
            {isHindi
              ? 'जो भी काम आपने लिए / पूरे किए हैं, सब यहां दिखेंगे'
              : 'All jobs you received, accepted and completed show here'}
          </Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsRow}>
        {(['new', 'accepted', 'completed'] as BookingStatus[]).map(key => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabChip,
                active && styles.tabChipActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setTab(key)}
            >
              <Text
                style={[
                  styles.tabText,
                  active && styles.tabTextActive,
                ]}
              >
                {tabLabel(key)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        contentContainerStyle={
          filtered.length === 0
            ? [styles.listContent, { flex: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="file-tray-outline"
              size={40}
              color="#9CA3AF"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई booking नहीं' : 'No bookings here'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'जब भी यहां नया काम आएगा, वो इसी टैब में दिखेगा.'
                : 'Whenever new work comes in, it will appear in this tab.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* OTP MODAL */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <Text style={styles.otpModalTitle}>
              {isHindi ? 'पंजीकरण OTP (4-digit)' : 'Enter Completion OTP'}
            </Text>
            <Text style={styles.otpModalSub}>
              {isHindi
                ? 'मालिक (User) से 4 अंकों का OTP लेकर यहां भरें'
                : 'Ask the Farmer for the 4-digit OTP to complete the job.'}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              value={otpValue}
              onChangeText={setOtpValue}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowOtpModal(false);
                  setOtpValue('');
                }}
              >
                <Text style={styles.cancelBtnText}>{isHindi ? 'रद्द करें' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={() => {
                  if (otpValue.length === 4 && otpJobId) {
                    updateBookingStatus(otpJobId, 'completed', otpValue);
                    setShowOtpModal(false);
                    setOtpValue('');
                  } else {
                    showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया 4 अंकों का सही OTP डालें' : 'Please enter a valid 4-digit OTP');
                  }
                }}
              >
                <Text style={styles.submitBtnText}>{isHindi ? 'सबमिट' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  tabsRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 7,
    marginRight: 6,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: '#16A34A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    shadowColor: '#00000015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  phoneText: {
    fontSize: 11,
    color: '#6B7280',
  },
  workRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  workText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubText: {
    color: '#6B7280',
    marginLeft: 3,
  },
  detailsBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  purposeBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  purposeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  purposeText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },



  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    alignItems: 'center',
  },
  rateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
  },
  acceptBtn: {
    backgroundColor: '#16A34A',
  },
  completeBtn: {
    backgroundColor: '#22C55E',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  otpModalSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  otpInput: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#111827',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  submitBtn: {
    backgroundColor: '#16A34A',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
