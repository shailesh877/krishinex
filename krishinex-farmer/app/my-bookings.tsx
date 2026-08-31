// app/my-bookings.tsx — KHETIFY "My Bookings" (tractor / implement history)

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi, IMAGE_BASE_URL } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

type BookingStatus = 'upcoming' | 'running' | 'completed' | 'cancelled';

type BookingType = 'tractor' | 'rotavator' | 'harvester' | 'sprayer' | 'other';

type Booking = {
  id: string;
  type: BookingType;
  title: string;          // Tractor with driver, Rotavator etc.
  vendorName: string;     // kiska book kiya hai
  village: string;
  fieldAddress: string;
  pricingMode: 'hour' | 'day';
  hours?: number;         // if hour-wise
  days?: number;          // if day-wise
  rateLabel: string;      // "₹ 900 / घंटा" etc.
  totalAmount: number;
  dateLabel: string;      // "02 Jan, 2026"
  slotLabel: string;      // "सुबह 09:00 - 12:00"
  completionOTP?: string;
  subMachinery?: { name: string, image: string }[];
};

type FilterKey = 'all' | 'upcoming' | 'running' | 'completed' | 'cancelled';

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');

  const fetchBookings = async () => {
    try {
      const [machineRes, labourRes] = await Promise.all([
        authApi.getMyMachineBookings(),
        authApi.getMyLabourBookings(),
      ]);

      const mapStatus = (s: string): BookingStatus => {
        const lower = s.toLowerCase();
        if (lower === 'new' || lower === 'accepted' || lower === 'pending') return 'upcoming';
        if (lower === 'in progress') return 'running';
        if (lower === 'completed') return 'completed';
        if (lower === 'cancelled') return 'cancelled';
        return 'upcoming';
      };

      const formatDate = (dStr: string) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        const months = hi ? ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };

      const formatTime = (dStr: string) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        let h = d.getHours();
        const m = d.getMinutes();
        const p = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m.toString().padStart(2, '0')} ${p}`;
      };

      const machineBookings: (Booking & { rawDate: Date })[] = machineRes.data.map((b: any) => ({
        id: b._id,
        type: b.machine?.category || 'tractor',
        title: hi ? (b.machine?.name || 'मशीन') : (b.machine?.name || 'Machine'),
        vendorName: b.owner?.name || (hi ? 'अज्ञात' : 'Unknown'),
        village: b.machine?.village || '',
        fieldAddress: b.fieldAddress || '',
        pricingMode: (b.priceType === 'hourly' || b.priceHour) ? 'hour' : 'day',
        hours: b.hours,
        days: b.days,
        rateLabel: (b.priceType === 'hourly' || b.priceHour) ? `₹${b.machine?.priceHour || b.priceHour || 0} / ${hi ? 'घंटा' : 'hr'}` : `₹${b.machine?.priceDay || b.priceDay || 0} / ${hi ? 'दिन' : 'day'}`,
        totalAmount: b.totalAmount,
        dateLabel: formatDate(b.fromDate || b.createdAt),
        slotLabel: b.fromDate ? `${hi ? 'समय' : 'Time'}: ${formatTime(b.fromDate)}` : ((b.priceType === 'hourly' || b.priceHour) ? `${hi ? 'समय' : 'Time'}: ${formatTime(b.createdAt)}` : (hi ? 'पूरा दिन' : 'Full Day')),
        status: mapStatus(b.status),
        rawDate: new Date(b.createdAt),
        subMachinery: b.selectedSubMachinery || [],
      }));

      const labourBookings: (Booking & { rawDate: Date })[] = labourRes.data.map((b: any) => ({
        id: b._id,
        type: 'other',
        title: hi ? (b.workType || 'लेबर') : (b.workType || 'Labour'),
        vendorName: b.labour?.name || (hi ? 'अज्ञात' : 'Unknown'),
        village: '',
        fieldAddress: '',
        pricingMode: b.priceType === 'hourly' ? 'hour' : 'day',
        hours: b.hours || 0,
        days: b.days || 1,
        rateLabel: b.priceType === 'hourly' ? `₹${b.amount / (b.hours || 1)} / ${hi ? 'घंटा' : 'hr'}` : `₹${b.amount / (b.days || 1)} / ${hi ? 'दिन' : 'day'}`,
        totalAmount: b.amount,
        dateLabel: formatDate(b.fromDate || b.createdAt),
        slotLabel: b.fromDate ? `${hi ? 'समय' : 'Time'}: ${formatTime(b.fromDate)}` : (b.priceType === 'hourly' ? `${hi ? 'समय' : 'Time'}: ${formatTime(b.createdAt)}` : (hi ? 'पूरा दिन' : 'Full Day')),
        status: mapStatus(b.status),
        rawDate: new Date(b.createdAt),
        completionOTP: b.completionOTP,
      }));

      const combined = [...machineBookings, ...labourBookings].sort((a, b) => {
        const tA = a.rawDate?.getTime() || 0;
        const tB = b.rawDate?.getTime() || 0;
        return tB - tA;
      });

      setBookings(combined);
    } catch (error) {
      console.error('Fetch bookings error:', error);
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'बुकिंग लोड करने में विफल' : 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const t = {
    title: hi ? 'मेरी बुकिंग' : 'My Bookings',
    sub: hi
      ? 'आपने अभी तक क्या-क्या बुक किया है'
      : 'All services you have booked',
    summaryLabel: hi ? 'कुल बुकिंग' : 'Total bookings',
    upcoming: hi ? 'आने वाली' : 'Upcoming',
    running: hi ? 'चालू' : 'Running',
    completed: hi ? 'पूरी हुई' : 'Completed',
    cancelled: hi ? 'रद्द' : 'Cancelled',
    all: hi ? 'सभी' : 'All',
    vendorLabel: hi ? 'सेवा प्रदाता' : 'Service provider',
    placeLabel: hi ? 'गांव/इलाका' : 'Village / Area',
    addressLabel: hi ? 'खेत का पता' : 'Field address',
    timeLabel: hi ? 'तारीख व समय' : 'Date & time',
    modeHour: hi ? 'घंटा के हिसाब से' : 'Hour-wise',
    modeDay: hi ? 'दिन के हिसाब से' : 'Day-wise',
    qtyLabel: hi ? 'बुकिंग अवधि' : 'Booking duration',
    totalLabel: hi ? 'कुल राशि' : 'Total amount',
    statusText: (s: BookingStatus) => {
      if (s === 'upcoming') return hi ? 'कन्फर्म (आने वाली)' : 'Confirmed (upcoming)';
      if (s === 'running') return hi ? 'चालू' : 'In progress';
      if (s === 'completed') return hi ? 'पूरी हो गई' : 'Completed';
      return hi ? 'रद्द' : 'Cancelled';
    },
    bookingIdLabel: hi ? 'बुकिंग आईडी' : 'Booking ID',
  };

  const statusColor = (s: BookingStatus) => {
    if (s === 'upcoming') return '#2563EB';
    if (s === 'running') return '#F59E0B';
    if (s === 'completed') return '#16A34A';
    return '#DC2626';
  };
  const statusBg = (s: BookingStatus) => `${statusColor(s)}18`;

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b: Booking) => b.status === statusFilter);
  }, [statusFilter, bookings]);

  const totalCount = bookings.length;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* TOP SUMMARY + FILTER */}
      <View style={styles.topContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{t.summaryLabel}</Text>
              <Text style={styles.summaryValue}>{totalCount}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Ionicons
                name="trail-sign-outline"
                size={16}
                color="#047857"
              />
              <Text style={styles.summaryBadgeText}>
                {hi ? 'किराये की हिस्ट्री' : 'Rental history'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryStrip}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.summaryStripText}>
              {hi
                ? 'यहाँ सिर्फ बुकिंग कन्फर्म होने का रिकॉर्ड दिखता है।'
                : 'This page only shows what you have successfully booked.'}
            </Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <FilterChip
              label={t.all}
              active={statusFilter === 'all'}
              onPress={() => setStatusFilter('all')}
            />
            <FilterChip
              label={t.upcoming}
              active={statusFilter === 'upcoming'}
              onPress={() => setStatusFilter('upcoming')}
            />
            <FilterChip
              label={t.running}
              active={statusFilter === 'running'}
              onPress={() => setStatusFilter('running')}
            />
            <FilterChip
              label={t.completed}
              active={statusFilter === 'completed'}
              onPress={() => setStatusFilter('completed')}
            />
            <FilterChip
              label={t.cancelled}
              active={statusFilter === 'cancelled'}
              onPress={() => setStatusFilter('cancelled')}
            />
          </ScrollView>
        </View>
      </View>

      {/* LIST */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.listCard}>
          {loading ? (
            <View style={{ padding: 40 }}>
              <ActivityIndicator color={KHETIFY_GREEN_DARK} />
            </View>
          ) : filteredBookings.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="basket-outline" size={40} color="#9CA3AF" />
              <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 13 }}>
                {hi ? 'कोई बुकिंग नहीं मिली' : 'No bookings found'}
              </Text>
            </View>
          ) : (
            filteredBookings.map((b: Booking, index) => (
              <View
                key={b.id}
                style={[
                  styles.bookingCard,
                  index === filteredBookings.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {/* top row */}
                <View style={styles.bookingHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={
                          b.type === 'tractor'
                            ? 'car-sport-outline'
                            : b.type === 'harvester'
                              ? 'construct-outline'
                              : 'cog-outline'
                        }
                        size={18}
                        color={KHETIFY_GREEN_DARK}
                      />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.bookingTitle} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text style={styles.bookingSub} numberOfLines={1}>
                        {t.vendorLabel}: {b.vendorName}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusBg(b.status) },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor(b.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColor(b.status) },
                      ]}
                    >
                      {t.statusText(b.status)}
                    </Text>
                  </View>
                </View>

                {/* OTP Display for Labour Bookings */}
                {(b.status === 'upcoming' || b.status === 'running') && (
                  b.completionOTP ? (
                    <View style={styles.otpBanner}>
                      <Ionicons name="key-outline" size={14} color="#047857" />
                      <Text style={styles.otpText}>
                        {hi ? `काम पूरा होने का OTP: ` : `Job Completion OTP: `}
                        <Text style={styles.otpCode}>{b.completionOTP}</Text>
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.otpBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                      <Ionicons name="time-outline" size={14} color="#B45309" />
                      <Text style={[styles.otpText, { color: '#92400E' }]}>
                        {hi ? `लेबर के स्वीकार करने का इंतज़ार है...` : `Waiting for labourer to accept...`}
                      </Text>
                    </View>
                  )
                )}

                {/* body */}
                <View style={styles.bookingBody}>
                  <InfoRow
                    label={t.bookingIdLabel}
                    value={b.id}
                  />
                  <InfoRow
                    label={t.placeLabel}
                    value={`${b.village}`}
                  />
                  <InfoRow
                    label={t.addressLabel}
                    value={b.fieldAddress}
                  />
                  <InfoRow
                    label={t.timeLabel}
                    value={`${b.dateLabel} • ${b.slotLabel}`}
                  />
                  <InfoRow
                    label={t.qtyLabel}
                    value={
                      b.pricingMode === 'hour'
                        ? hi
                          ? `${b.hours} घंटे (${b.rateLabel})`
                          : `${b.hours} hours (${b.rateLabel})`
                        : hi
                          ? `${b.days} दिन (${b.rateLabel})`
                          : `${b.days} day (${b.rateLabel})`
                    }
                  />

                  {b.subMachinery && b.subMachinery.length > 0 && (
                    <View style={{ marginTop: 8, paddingHorizontal: 0 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
                        {hi ? 'चुने गए अटैचमेंट:' : 'Selected Attachments:'}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {b.subMachinery.map((sub, idx) => (
                           <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                              {sub.image ? (
                                <Image 
                                  source={{ uri: sub.image.startsWith('http') ? sub.image : `${IMAGE_BASE_URL}/${sub.image.replace(/^\//, '')}` }} 
                                  style={{ width: 20, height: 20, borderRadius: 4, marginRight: 6 }} 
                                />
                              ) : (
                                <Ionicons name="construct-outline" size={12} color="#4B5563" style={{ marginRight: 4 }} />
                              )}
                              <Text style={{ fontSize: 10, color: '#374151', fontWeight: '800' }}>{sub.name}</Text>
                           </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t.totalLabel}</Text>
                    <Text style={styles.totalValue}>
                      ₹ {b.totalAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  topContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  summaryBadgeText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  summaryStrip: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStripText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },

  filterContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterScrollContent: {
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#F9FAFB',
  },

  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },

  bookingCard: {
    borderBottomWidth: 0.7,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  otpBanner: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#10B981',
  },
  otpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 6,
  },
  otpCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 2,
  },
  bookingSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  bookingBody: {
    marginTop: 6,
    marginLeft: 44,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 0.7,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
});
