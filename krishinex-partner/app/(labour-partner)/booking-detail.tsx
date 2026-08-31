// app/(labour-partner)/booking-detail.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BookingStatus = 'new' | 'accepted' | 'completed';

type BookingDetail = {
  id: string;
  farmerName: string;
  phone: string;
  village: string;
  district: string;
  distanceKm: number;
  workType: string;
  workDescription: string;
  dateLabel: string;
  startTime: string;
  hours?: number;
  days?: number;
  priceType: 'hourly' | 'daily';
  offerRate: number;
  paymentMode: 'CASH' | 'WALLET';
  purpose?: string;
  status: BookingStatus;
  platformCommission?: number;
  ownerPayout?: number;
};

// dummy data – future me API se by id fetch karna
const MOCK_BOOKING: BookingDetail = {
  id: '1',
  farmerName: 'Ram Singh',
  phone: '+91 98765 12340',
  village: 'Rampur',
  district: 'Kanpur Dehat',
  distanceKm: 4.2,
  workType: 'Wheat cutting',
  workDescription:
    '1 एकड़ गेहूं की कटाई, कटाई के बाद बंडल बनाना और खेत साफ करना.',
  dateLabel: 'Today, 2:30 PM',
  startTime: '2:30 PM',
  hours: 6,
  days: 1,
  priceType: 'daily',
  offerRate: 750,
  paymentMode: 'CASH',
  purpose: '1 एकड़ गेहूं की कटाई के लिए मजदूर चाहिए',
  status: 'new',
};

export default function LabourBookingDetailScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ id?: string }>();
  const currentBookingId = params.id || MOCK_BOOKING.id;

  // TODO: yahan currentBookingId ke basis pe API call se booking laana
  const booking = MOCK_BOOKING;

  const isNew = booking.status === 'new';
  const isAccepted = booking.status === 'accepted';
  const isCompleted = booking.status === 'completed';

  const rateLabel =
    booking.priceType === 'daily'
      ? isHindi
        ? 'प्रति दिन'
        : 'per day'
      : isHindi
      ? 'प्रति घंटा'
      : 'per hour';

  const handleCallFarmer = () => {
    // Linking.openURL(`tel:${booking.phone}`)  // later add
  };

  const handleChat = () => {
    // WhatsApp / in-app chat open
  };

  const handleAccept = () => {
    // TODO: API call + state update
  };

  const handleReject = () => {
    // TODO: API call + state update
  };

  const handleMarkComplete = () => {
    // TODO: API call + state update
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'Booking detail' : 'Booking detail'}
          </Text>
          <Text style={styles.headerSub}>
            {isHindi
              ? 'किसान की पूरी डिटेल और काम की जानकारी'
              : 'Full farmer details and job info'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STATUS STRIP */}
        <View style={styles.statusStrip}>
          <View style={styles.statusLeft}>
            <View style={styles.statusIconWrap}>
              <Ionicons
                name={
                  isCompleted
                    ? 'checkmark-done-outline'
                    : isAccepted
                    ? 'time-outline'
                    : 'sparkles-outline'
                }
                size={18}
                color={isCompleted ? '#16A34A' : isAccepted ? '#F97316' : '#2563EB'}
              />
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.statusTitle}>
                {isNew && (isHindi ? 'नया काम मिला है' : 'New work request')}
                {isAccepted &&
                  (isHindi ? 'काम accept कर चुके हैं' : 'Job already accepted')}
                {isCompleted &&
                  (isHindi ? 'यह काम पूरा हो चुका है' : 'This job is completed')}
              </Text>
              <Text style={styles.statusSub}>
                {isHindi
                  ? 'डिटेल चेक करके नीचे से action चुनें'
                  : 'Check details and choose action below'}
              </Text>
            </View>
          </View>
          <Text style={styles.bookingIdText}>#{currentBookingId}</Text>
        </View>

        {/* FARMER CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardTitle}>{booking.farmerName}</Text>
              <View style={styles.cardSubRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color="#6B7280"
                />
                <Text style={styles.cardSubText}>
                  {booking.village}, {booking.district}
                </Text>
              </View>
            </View>
            <View style={styles.distancePill}>
              <Ionicons name="navigate-outline" size={12} color="#2563EB" />
              <Text style={styles.distanceText}>
                {booking.distanceKm.toFixed(1)} km
              </Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#DCFCE7' }]}
              activeOpacity={0.9}
              onPress={handleCallFarmer}
            >
              <Ionicons name="call-outline" size={14} color="#16A34A" />
              <Text style={[styles.contactText, { color: '#166534' }]}>
                {isHindi ? 'कॉल करें' : 'Call farmer'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#E0F2FE' }]}
              activeOpacity={0.9}
              onPress={handleChat}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#2563EB" />
              <Text style={[styles.contactText, { color: '#1D4ED8' }]}>
                {isHindi ? 'चैट / व्हाट्सऐप' : 'Chat / WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* WORK DETAILS */}
        <View style={styles.card}>
          <Text style={styles.sectionSmallTitle}>
            {isHindi ? 'काम की जानकारी' : 'Work details'}
          </Text>

          <View style={styles.rowBetween}>
            <View style={styles.inlineRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#4B5563"
              />
              <Text style={styles.rowLabel}>
                {booking.dateLabel}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Ionicons name="time-outline" size={15} color="#4B5563" />
              <Text style={styles.rowLabel}>
                {isHindi ? 'शुरू' : 'Start'} {booking.startTime}
              </Text>
            </View>
          </View>

          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <View style={styles.inlineRow}>
              <Ionicons name="hourglass-outline" size={15} color="#4B5563" />
              <Text style={styles.rowLabel}>
                {booking.priceType === 'hourly' ? `${booking.hours} ${isHindi ? 'घंटे' : 'hours'}` : `${booking.days} ${isHindi ? 'दिन' : 'days'}`}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Ionicons name="wallet-outline" size={15} color="#4B5563" />
              <Text style={styles.rowLabel}>
                {isHindi ? 'भुगतान:' : 'Payment:'} {booking.paymentMode === 'WALLET' ? (isHindi ? 'वॉलेट' : 'Wallet') : (isHindi ? 'नकद' : 'Cash')}
              </Text>
            </View>
          </View>

          <View style={styles.rateRow}>
            <View style={styles.rateLeft}>
              <Text style={styles.rateMain}>
                ₹ {booking.offerRate}{' '}
                <Text style={styles.rateSub}>/ {rateLabel}</Text>
              </Text>
              <Text style={styles.rateHint}>
                {isHindi
                  ? 'रेट per व्यक्ति के हिसाब से है'
                  : 'Rate is per person basis'}
              </Text>
            </View>
            <View style={styles.tagPill}>
              <Ionicons name="leaf-outline" size={14} color="#15803D" />
              <Text style={styles.tagPillText}>{booking.workType}</Text>
            </View>
          </View>

          <Text style={styles.descLabel}>
            {isHindi ? 'काम का पूरा विवरण' : 'Work description'}
          </Text>
          <Text style={styles.descText}>{booking.workDescription}</Text>

          {booking.purpose ? (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <Text style={styles.descLabel}>
                {isHindi ? 'काम का उद्देश्य' : 'Purpose of work'}
              </Text>
              <Text style={styles.descText}>{booking.purpose}</Text>
            </View>
          ) : null}
        </View>

        {/* STATUS TIMELINE LIGHT */}
        <View style={styles.card}>
          <Text style={styles.sectionSmallTitle}>
            {isHindi ? 'स्टेटस टाइमलाइन' : 'Status timeline'}
          </Text>

          <View style={styles.timelineRow}>
            <View style={styles.timelineDotActive} />
            <Text style={styles.timelineText}>
              {isHindi
                ? 'किसान ने booking भेजी'
                : 'Farmer created booking'}
            </Text>
          </View>

          <View style={styles.timelineConnector} />

          <View style={styles.timelineRow}>
            <View
              style={
                isAccepted || isCompleted
                  ? styles.timelineDotActive
                  : styles.timelineDotInactive
              }
            />
            <Text style={styles.timelineText}>
              {isHindi ? 'आपने काम accept किया' : 'You accepted the job'}
            </Text>
          </View>

          <View style={styles.timelineConnector} />

          <View style={styles.timelineRow}>
            <View
              style={
                isCompleted
                  ? styles.timelineDotActive
                  : styles.timelineDotInactive
              }
            />
            <Text style={styles.timelineText}>
              {isHindi ? 'काम पूरा और confirm' : 'Work completed & confirmed'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        {isNew && (
          <>
            <TouchableOpacity
              style={[styles.bottomBtn, styles.bottomReject]}
              activeOpacity={0.9}
              onPress={handleReject}
            >
              <Ionicons name="close-outline" size={18} color="#B91C1C" />
              <Text style={[styles.bottomBtnText, { color: '#B91C1C' }]}>
                {isHindi ? 'Reject' : 'Reject'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomBtn, styles.bottomAccept]}
              activeOpacity={0.9}
              onPress={handleAccept}
            >
              <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.bottomBtnText, { color: '#FFFFFF' }]}>
                {isHindi ? 'Accept booking' : 'Accept booking'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isAccepted && (
          <TouchableOpacity
            style={[styles.bottomBtn, styles.bottomPrimary]}
            activeOpacity={0.9}
            onPress={handleMarkComplete}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={[styles.bottomBtnText, { color: '#FFFFFF' }]}>
              {isHindi ? 'काम पूरा mark करें' : 'Mark job as complete'}
            </Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedWrap}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#16A34A"
            />
            <Text style={styles.completedText}>
              {isHindi
                ? 'यह booking पहले से complete है'
                : 'This booking is already marked completed'}
            </Text>
          </View>
        )}
      </View>
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

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  statusStrip: {
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14532D',
  },
  statusSub: {
    fontSize: 11,
    color: '#4B5563',
  },
  bookingIdText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardSubText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 3,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  distanceText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
    marginLeft: 3,
  },

  contactRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  sectionSmallTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },

  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 8,
  },
  rateLeft: {
    flex: 1,
    marginRight: 10,
  },
  rateMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  rateSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  rateHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
  },
  tagPillText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    marginLeft: 3,
  },

  descLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  descText: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
  },

  // timeline
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timelineDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  timelineDotInactive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  timelineConnector: {
    height: 12,
    marginLeft: 4,
    borderLeftWidth: 1,
    borderColor: '#D1D5DB',
  },
  timelineText: {
    fontSize: 11,
    color: '#4B5563',
  },

  // bottom bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    columnGap: 8,
  },
  bottomBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAccept: {
    backgroundColor: '#16A34A',
  },
  bottomReject: {
    backgroundColor: '#FEE2E2',
  },
  bottomPrimary: {
    backgroundColor: '#16A34A',
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  completedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  completedText: {
    fontSize: 12,
    color: '#166534',
    marginLeft: 6,
    fontWeight: '600',
  },
});
