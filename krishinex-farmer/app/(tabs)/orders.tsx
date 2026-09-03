// app/(tabs)/orders.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '@/context/I18nContext';
import { authApi, IMAGE_BASE_URL } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const GREEN_LIGHT = '#a3d546ff';
const SHADOW_COLOR = '#00000020';

let RAM_CACHE_ORDERS: any = null;
let RAM_CACHE_ORDERS_TIMESTAMP = 0;

type Category = 'shop' | 'booking';

export default function UnifiedOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<Category>('shop');
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData(); // initial fetch on focus
      
      const interval = setInterval(() => {
        // Silent fetch every 5 seconds for active orders
        fetchData(true, true);
      }, 5000);

      const sub = DeviceEventEmitter.addListener('pushNotificationReceived', (notif) => {
        console.log('[ORDERS] Received push notification, refreshing...');
        fetchData(true, true);
      });

      return () => {
        clearInterval(interval);
        sub.remove();
      };
    }, [])
  );

  const fetchData = async (forceRefresh = false, silent = false) => {
    try {
      if (!forceRefresh && RAM_CACHE_ORDERS) {
        setShopOrders(RAM_CACHE_ORDERS.shopOrders);
        setBookings(RAM_CACHE_ORDERS.bookings);
        if (!silent) setLoading(false);
        const age = Date.now() - RAM_CACHE_ORDERS_TIMESTAMP;
        if (age < 5 * 60 * 1000) {
          console.log('[DEBUG] Skipping Orders API call, RAM cache is fresh');
          return;
        }
      } else if (!forceRefresh && !silent) {
        setLoading(true);
      }

      const [newShopOrders, newBookings] = await Promise.all([fetchShopOrders(), fetchBookings()]);
      
      RAM_CACHE_ORDERS = {
        shopOrders: newShopOrders,
        bookings: newBookings
      };
      RAM_CACHE_ORDERS_TIMESTAMP = Date.now();
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchShopOrders = async () => {
    try {
      const res = await authApi.getMyShopOrders();
      setShopOrders(res.data);
      return res.data;
    } catch (e) {
      console.error('Fetch shop orders error', e);
      return [];
    }
  };

  const fetchBookings = async () => {
    try {
      const [machineRes, labourRes] = await Promise.all([
        authApi.getMyMachineBookings(),
        authApi.getMyLabourBookings(),
      ]);

      const mapStatus = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === 'new' || lower === 'accepted' || lower === 'pending') return 'upcoming';
        if (lower === 'in progress') return 'running';
        if (lower === 'completed') return 'completed';
        if (lower === 'cancelled') return 'cancelled';
        return 'upcoming';
      };

      const machines = machineRes.data.map((b: any) => {
        let displayImg = '';
        if (b.machine?.images && b.machine.images.length > 0) {
           const imgPath = b.machine.images[0].replace(/\\/g, '/');
           displayImg = imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE_URL}/${imgPath.startsWith('/') ? imgPath.slice(1) : imgPath}`;
        } else {
           displayImg = 'https://i.ibb.co/9rQk7Xy/tractor.png';
        }
        return {
          id: b._id,
          type: 'machine',
          category: b.machine?.category || 'tractor',
          title: b.machine?.name || (hi ? 'मशीन' : 'Machine'),
          owner: b.owner?.name || (hi ? 'अज्ञात' : 'Unknown'),
          date: new Date(b.createdAt),
          amount: b.totalAmount,
          status: mapStatus(b.status),
          completionOTP: b.completionOTP,
          imageUrl: displayImg,
          raw: b
        };
      });

      const labours = labourRes.data.map((b: any) => {
        let displayImg = '';
        if (b.labour?.profilePhotoUrl) {
           const imgPath = b.labour.profilePhotoUrl.replace(/\\/g, '/');
           displayImg = imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE_URL}/${imgPath.startsWith('/') ? imgPath.slice(1) : imgPath}`;
        } else {
           displayImg = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        }
        return {
          id: b._id,
          type: 'labour',
          category: 'labour',
          title: hi ? (b.workType || 'लेबर') : (b.workType || 'Labour'),
          owner: b.labour?.name || (hi ? 'अज्ञात' : 'Unknown'),
          date: new Date(b.createdAt),
          amount: b.amount,
          status: mapStatus(b.status),
          completionOTP: b.completionOTP,
          imageUrl: displayImg,
          raw: b
        };
      });

      const combined = [...machines, ...labours].sort((a, b) => b.date.getTime() - a.date.getTime());
      setBookings(combined);
      return combined;
    } catch (e) {
      console.error('Fetch bookings error', e);
      return [];
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const getShopStatusConfig = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return { color: '#16A34A', label: hi ? 'डिलीवर' : 'Delivered', icon: 'checkmark-circle' };
    if (s === 'CANCELLED') return { color: '#DC2626', label: hi ? 'रद्द' : 'Cancelled', icon: 'close-circle' };
    if (s === 'IN_PROGRESS' || s === 'OUT_FOR_DELIVERY') return { color: '#2563EB', label: hi ? 'डिलीवरी पर है' : 'On the Way', icon: 'bicycle-outline' };
    if (s === 'ACCEPTED') return { color: '#10B981', label: hi ? 'स्वीकार किया' : 'Accepted', icon: 'checkmark-done' };
    return { color: '#F97316', label: hi ? 'लंबित' : 'Pending', icon: 'time' };
  };

  const getBookingStatusConfig = (status: string) => {
    if (status === 'completed') return { color: '#166534', label: hi ? 'पूर्ण' : 'Completed', icon: 'checkmark-done' };
    if (status === 'cancelled') return { color: '#B91C1C', label: hi ? 'रद्द' : 'Cancelled', icon: 'close' };
    if (status === 'running') return { color: '#F59E0B', label: hi ? 'चालू' : 'Running', icon: 'play' };
    return { color: '#2563EB', label: hi ? 'आने वाली' : 'Upcoming', icon: 'calendar' };
  };

  const t = {
    title: hi ? 'मेरी हिस्ट्री' : 'My History',
    shopTab: hi ? 'शॉप ऑर्डर' : 'Shop Orders',
    bookingTab: hi ? 'बुकिंग हिस्ट्री' : 'Bookings',
    emptyOrders: hi ? 'कोई शॉप ऑर्डर नहीं' : 'No shop orders found',
    emptyBookings: hi ? 'कोई बुकिंग नहीं मिली' : 'No bookings found',
    orderId: hi ? 'ऑर्डर आईडी' : 'Order ID',
    placedOn: hi ? 'दिनांक' : 'Placed on',
    items: hi ? 'आइटम्स' : 'Items',
    total: hi ? 'कुल राशि' : 'Total Amount',
    vendor: hi ? 'प्रदाता' : 'Provider',
    village: hi ? 'गांव' : 'Village',
    address: hi ? 'पता' : 'Address',
    duration: hi ? 'अवधि' : 'Duration',
    viewDetails: hi ? 'विवरण देखें' : 'View Details',
    timeLabel: hi ? 'समय' : 'Time',
    bookingId: hi ? 'बुकिंग आईडी' : 'Booking ID',
  };

  const formatTime = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${p}`;
  };

  const mainLogo = hi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={{ width: 42 }} />
        <Image source={mainLogo} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={() => fetchData(true)}>
          <Ionicons name="refresh" size={22} color={GREEN_DARK} />
        </TouchableOpacity>
      </View>

      {/* CATEGORY TOGGLE */}
      <View style={styles.toggleWrapper}>
        <View style={styles.toggleBg}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeCategory === 'shop' && styles.toggleBtnActive]}
            onPress={() => setActiveCategory('shop')}
          >
            <Ionicons 
              name="cart" 
              size={16} 
              color={activeCategory === 'shop' ? GREEN_DARK : '#6B7280'} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleText, activeCategory === 'shop' && styles.toggleTextActive]}>
              {t.shopTab}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeCategory === 'booking' && styles.toggleBtnActive]}
            onPress={() => setActiveCategory('booking')}
          >
            <Ionicons 
              name="calendar" 
              size={16} 
              color={activeCategory === 'booking' ? GREEN_DARK : '#6B7280'} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleText, activeCategory === 'booking' && styles.toggleTextActive]}>
              {t.bookingTab}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
      >
        {loading && !refreshing && (
          <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 50 }} />
        )}

        {!loading && activeCategory === 'shop' && (
          shopOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t.emptyOrders}</Text>
            </View>
          ) : (
            shopOrders.map((order) => {
              const cfg = getShopStatusConfig(order.status);
              const dateStr = new Date(order.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN', { 
                day: 'numeric', month: 'short', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              });
              
              return (
                <TouchableOpacity 
                   key={order._id} 
                   style={styles.card} 
                   activeOpacity={0.9}
                   onPress={() => router.push({ pathname: '/track-order', params: { id: order._id } })}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.iconCircle}>
                       <Ionicons name="cube" size={20} color={GREEN_DARK} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                       <Text style={styles.cardTitle} numberOfLines={1}>
                         {order.items.map((it: any) => it.name).join(', ')}
                       </Text>
                       <Text style={styles.cardSub}>#{order._id.slice(-6).toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                       <Text style={styles.cardPrice}>₹ {order.totalAmount}</Text>
                       <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}15`, marginTop: 4 }]}>
                         <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                         <Text style={[styles.statusText, { color: cfg.color, fontSize: 10 }]}>{cfg.label}</Text>
                       </View>
                    </View>
                  </View>

                  <View style={styles.cardDetailSection}>
                    <InfoRow label={t.placedOn} value={dateStr} />
                    <InfoRow 
                      label={t.items} 
                      value={order.items.map((it: any) => `${it.name} (${it.quantity} ${it.unit || ''})`).join('\n')} 
                    />
                  </View>

                  <View style={styles.cardFooterPremium}>
                    <Text style={styles.viewDetailsText}>{t.viewDetails}</Text>
                    <Ionicons name="chevron-forward" size={16} color={GREEN_DARK} />
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}

        {!loading && activeCategory === 'booking' && (
          bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t.emptyBookings}</Text>
            </View>
          ) : (
            bookings.map((b) => {
              const cfg = getBookingStatusConfig(b.status);
              const dateStr = b.date.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { 
                day: 'numeric', month: 'short', year: 'numeric' 
              });
              
              const raw = b.raw || {};
              const hasFromDate = !!raw.fromDate;
              const isHourly = raw.priceType === 'hourly' || raw.priceHour;
              const timeStr = hasFromDate ? formatTime(b.date) : (isHourly ? formatTime(new Date(raw.createdAt)) : (hi ? 'पूरा दिन' : 'Full Day'));

              return (
                <View key={b.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5', overflow: 'hidden' }]}>
                       {b.imageUrl ? (
                         <Image source={{ uri: b.imageUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                       ) : (
                         <Ionicons name={b.type === 'machine' ? 'construct' : 'person'} size={20} color={GREEN_DARK} />
                       )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                       <Text style={styles.cardTitle}>{b.title}</Text>
                       <Text style={styles.cardSub}>{b.type === 'machine' ? (hi ? 'मशीन बुकिंग' : 'Machine Booking') : (hi ? 'लेबर बुकिंग' : 'Labour Booking')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                       <Text style={styles.cardPrice}>₹ {b.amount}</Text>
                       <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}15`, marginTop: 4 }]}>
                         <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                         <Text style={[styles.statusText, { color: cfg.color, fontSize: 10 }]}>{cfg.label}</Text>
                       </View>
                    </View>
                  </View>

                  {b.completionOTP && (b.status === 'upcoming' || b.status === 'running') && (
                    <View style={styles.otpBanner}>
                      <Ionicons name="key-outline" size={14} color="#047857" />
                      <Text style={styles.otpText}>
                        {hi ? `काम पूरा होने का OTP: ` : `Job Completion OTP: `}
                        <Text style={styles.otpCode}>{b.completionOTP}</Text>
                      </Text>
                    </View>
                  )}
                  {(!b.completionOTP) && (b.status === 'upcoming' || b.status === 'running') && (
                    <View style={[styles.otpBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                      <Ionicons name="time-outline" size={14} color="#B45309" />
                      <Text style={[styles.otpText, { color: '#92400E' }]}>
                        {hi ? (b.type === 'machine' ? `पार्टनर के स्वीकार करने का इंतज़ार है...` : `लेबर के स्वीकार करने का इंतज़ार है...`) : (b.type === 'machine' ? `Waiting for partner to accept...` : `Waiting for labourer to accept...`)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.cardDetailSection}>
                    <InfoRow label={t.bookingId} value={b.id} />
                    <InfoRow label={t.vendor} value={b.owner} />
                    <InfoRow label={t.placedOn} value={dateStr} />
                    <InfoRow label={t.timeLabel} value={timeStr} />
                    <InfoRow label={hi ? 'बुकिंग का उद्देश्य' : 'Purpose'} value={b.raw?.purpose || (hi ? 'कोई नहीं' : 'None')} />
                    {b.type === 'machine' && (
                        <InfoRow label={t.village} value={b.raw?.machine?.village || (hi ? 'अज्ञात' : 'Unknown')} />
                    )}
                    <InfoRow 
                      label={t.duration} 
                      value={(() => {
                        const raw = b.raw || {};
                        // Use explicit fields if they exist from the new schema
                        if (raw.priceType === 'hourly' || (raw.hours && raw.hours > 0)) {
                          const hrs = raw.hours || 1;
                          const rate = raw.machine?.priceHour || raw.priceHour || (raw.amount ? Math.round(raw.amount / hrs) : '');
                          return `${hrs} ${hi ? 'घंटे' : 'hrs'}${rate ? ` (₹${rate}/${hi ? 'घंटा' : 'hr'})` : ''}`;
                        } 
                        
                        if (raw.priceType === 'kattha' || (raw.kattha && raw.kattha > 0)) {
                          const k = raw.kattha || 1;
                          const rate = raw.machine?.priceKattha || raw.priceKattha || (raw.amount ? Math.round(raw.amount / k) : '');
                          return `${k} ${hi ? 'कट्ठा' : 'kattha'}${rate ? ` (₹${rate}/${hi ? 'कट्ठा' : 'kattha'})` : ''}`;
                        }

                        if (raw.priceType === 'daily' || (raw.days && raw.days > 0)) {
                          const days = raw.days || (raw.fromDate && raw.toDate ? Math.ceil(Math.abs(new Date(raw.toDate).getTime() - new Date(raw.fromDate).getTime()) / (1000 * 60 * 60 * 24)) : 1) || 1;
                          const rate = raw.machine?.priceDay || raw.priceDay || (raw.amount ? Math.round(raw.amount / days) : '');
                          return `${days} ${hi ? 'दिन' : 'days'}${rate ? ` (₹${rate}/${hi ? 'दिन' : 'day'})` : ''}`;
                        }

                        // Fallback for old data: guess from dates
                        const start = new Date(raw.fromDate || Date.now());
                        const end = new Date(raw.toDate || Date.now());
                        const diffMs = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
                        
                        // If it's the same exact timestamp (like our current book-equipment logic), assume it's daily unless we have hints
                        return `${diffDays} ${hi ? 'दिन' : 'days'}`;
                      })()} 
                    />

                    {b.raw?.selectedSubMachinery && b.raw.selectedSubMachinery.length > 0 && (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
                          {hi ? 'चुने गए अटैचमेंट:' : 'Selected Attachments:'}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {b.raw.selectedSubMachinery.map((sub: any, idx: number) => (
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
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: { width: 140, height: 26 },
  
  toggleWrapper: { padding: 16, backgroundColor: '#FFFFFF' },
  toggleBg: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  toggleTextActive: { color: GREEN_DARK },

  scrollContent: { padding: 16, paddingBottom: 100 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  cardSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  cardPrice: { fontSize: 15, fontWeight: '900', color: GREEN_DARK },
  
  cardDetailSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    width: '35%',
  },
  infoValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  cardFooterPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 8,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN_DARK,
    marginRight: 4,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '800', marginLeft: 4 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#9CA3AF' },

  otpBanner: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
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
});
