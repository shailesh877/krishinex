import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/orders`;

type AssignedStatus = 'new' | 'ok' | 'delivered' | 'cancelled';

type AssignedOrder = {
  _id: string;
  farmerName: string;
  farmerMobile: string;
  village: string;
  district: string;
  state: string;
  crop: string;
  quantity: string;
  variety?: string;
  pricePerQuintal: number;
  pricePerKg: number;
  note?: string;
  createdAt: string;
  assignedStatus: AssignedStatus;
  imageUrl?: string;
  cancelReason?: string;
  sellRequestId?: string;
  pincode?: string;
  amount?: number;
  commission?: number;
  commissionRate?: number;
};

const defaultCropImage = require('../../assets/images/android-icon-foreground.png');

export default function AssignedOrders() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'completed'>('pending');
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [otps, setOtps] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const [editQty, setEditQty] = useState<Record<string, string>>({});
  const [editPrice, setEditPrice] = useState<Record<string, string>>({});

  const t = {
    hi: {
      title: 'असाइन ऑर्डर',
      sub: 'जो ऑर्डर आपको असाइन किए गए हैं',
      tabPending: 'Pending',
      tabAccepted: 'Accepted',
      tabCompleted: 'Completed',
      farmer: 'किसान',
      address: 'पता',
      crop: 'फसल',
      qty: 'मात्रा',
      mobile: 'मोबाइल',
      pricePerQtl: '₹/क्विंटल',
      pricePerKg: '₹/किलो',
      note: 'नोट',
      assignedAt: 'तारीख',
      btnAccept: 'स्वीकार करें',
      btnOk: '✓ OK',
      btnDelivered: 'डिलीवर हो गया',
      btnCancel: 'रद्द करें',
      cancelPlaceholder: 'कैंसल करने का कारण लिखें',
      paymentInfo: 'डिलीवरी के बाद पेमेंट सिर्फ एडमिन को करें',
      empty: 'अभी तक कोई असाइन ऑर्डर नहीं है',
      statusNew: 'नया',
      statusOk: 'स्वीकृत',
      statusDelivered: 'डिलीवर',
      statusCancelled: 'रद्द',
      variety: 'वैरायटी',
      totalAmount: 'कुल राशि',
      commission: 'कमीशन',
      netPayout: 'कुल भुगतान (एडमिन को)',
      hidden: 'किसान (Hidden)' },
    en: {
      title: 'Assigned orders',
      sub: 'Orders assigned to you by admin',
      tabPending: 'Pending',
      tabAccepted: 'Accepted',
      tabCompleted: 'Completed',
      farmer: 'Farmer',
      address: 'Address',
      crop: 'Crop',
      qty: 'Qty (qtl)',
      mobile: 'Mobile',
      pricePerQtl: '₹/qtl',
      pricePerKg: '₹/kg',
      note: 'Note',
      assignedAt: 'Date',
      btnAccept: 'Accept Order',
      btnOk: '✓ OK',
      btnDelivered: 'Delivered',
      btnCancel: 'Cancel',
      cancelPlaceholder: 'Write reason for cancelling',
      paymentInfo: 'Check Net Payout below. One Debit for Crop, One for Commission.',
      empty: 'No assigned orders yet',
      statusNew: 'Pending',
      statusOk: 'Accepted',
      statusDelivered: 'Delivered',
      statusCancelled: 'Cancelled',
      variety: 'Variety',
      totalAmount: 'Crop Price',
      commission: 'Commission',
      netPayout: 'Net Payout',
      hidden: 'Farmer (Hidden)' } }[lang];

  const getKgValue = (qtyStr: string): string => {
    if (!qtyStr) return '0';
    const str = String(qtyStr).toLowerCase().trim();
    
    // Extract first number sequence
    const numMatch = str.match(/([\d.]+)/);
    const num = numMatch ? parseFloat(numMatch[1]) : 0;
    
    if (str.includes('kg') || str.includes('kilo')) {
      return Math.round(num).toString();
    }
    if (str.includes('quintal') || str.includes('qtl')) {
      return Math.round(num * 100).toString();
    }
    
    // Fallback: If it's a large number, assume KG, if small (< 50) assume Quintal?
    // Let's stick to parsing strictly if unit not present
    return Math.round(num).toString();
  };

  const fetchOrders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[ASSIGNED-ORDERS] Fetched:', data.length, 'orders');
        setOrders(data);
        
        // Populate edit states
        const q: Record<string, string> = {};
        const p: Record<string, string> = {};
        data.forEach((o: AssignedOrder) => {
          // Pre-populate for ALL orders so they are ready in memory
          q[o._id] = getKgValue(o.quantity);
          // Prioritize pricePerKg if available, else derive from pricePerQuintal
          p[o._id] = (o.pricePerKg || (o.pricePerQuintal ? o.pricePerQuintal / 100 : 0)).toString();
        });
        setEditQty(prev => ({ ...prev, ...q }));
        setEditPrice(prev => ({ ...prev, ...p }));
      }
    } catch (e) {
      console.error('Fetch assigned error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const updateStatus = async (id: string, status: AssignedStatus) => {
    const cancelReason = cancelReasons[id] || '';
    if (status === 'cancelled' && !cancelReason.trim()) {
      showAlert(
        isHindi ? 'कारण लिखें' : 'Enter reason',
        isHindi ? 'कैंसल करने का कारण लिखें' : 'Please write a reason before cancelling'
      );
      return;
    }

    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      if (user.status !== 'approved') {
        showAlert(
          isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
          isHindi 
            ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप यह कार्रवाई नहीं कर सकते।' 
            : 'Profile not verified. You cannot perform this action.'
        );
        return;
      }
    }

    setUpdating(prev => ({ ...prev, [id]: true }));
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/${id}/assigned-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          assignedStatus: status, 
          cancelReason,
          otp: otps[id] || '',
          quantity: editQty[id] ? `${editQty[id]} KG` : '',
          pricePerQuintal: editPrice[id] ? (parseFloat(editPrice[id]) * 100).toString() : ''
        })
      });
      if (res.ok) {
        const resData = await res.json();
        const updatedOrder = resData.order;
        setOrders(prev =>
          prev.map(o => o._id === id ? { ...o, ...updatedOrder } : o)
        );
      } else {
        const errorData = await res.json();
        showAlert('Error', errorData.error || 'Failed to update status');
      }
    } catch (e) {
      showAlert('Error', 'Network error');
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const statusBadge = (status: AssignedStatus) => {
    const map: Record<AssignedStatus, { label: string; color: string; bg: string }> = {
      new: { label: t.statusNew, color: '#2563EB', bg: '#EFF6FF' },
      ok: { label: t.statusOk, color: '#16A34A', bg: '#ECFDF5' },
      delivered: { label: t.statusDelivered, color: '#7C3AED', bg: '#F5F3FF' },
      cancelled: { label: t.statusCancelled, color: '#DC2626', bg: '#FEF2F2' } };
    return map[status] ?? map.new;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: AssignedOrder }) => {
    const isPending = activeTab === 'pending';
    const isAccepted = activeTab === 'accepted';
    const isCompleted = activeTab === 'completed';

    const address = [item.village, item.district, item.state].filter(Boolean).join(', ');
    const badge = statusBadge(item.assignedStatus);
    const isUpdating = updating[item._id];

    return (
      <View style={styles.cardOuter}>
        <View style={styles.cardInner}>
          {/* TOP ROW: image + details */}
          <View style={styles.topRow}>
            <View style={styles.imageWrap}>
              <Image
                source={item.imageUrl ? { uri: item.imageUrl } : defaultCropImage}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              {/* Farmer name + status badge */}
              <View style={styles.nameRow}>
                <Text style={styles.farmerName}>{isPending ? t.hidden : (item.farmerName || '—')}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="barcode-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={[styles.metaText, { color: '#16A34A', fontWeight: '800' }]}>
                  Order: #{item._id.toString().slice(-6).toUpperCase()}
                </Text>
              </View>

              {address ? (
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{address}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <Ionicons name="leaf-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>
                  {t.crop}: <Text style={styles.bold}>{item.crop}</Text>
                  {item.variety ? ` · ${item.variety}` : ''}
                  {!isAccepted && ` • ${t.qty}: `}
                </Text>
                {!isAccepted && <Text style={styles.bold}>{item.quantity}</Text>}
              </View>

              {isAccepted ? (
                <View style={{ marginTop: 6, gap: 8 }}>
                  <View style={[styles.cancelBox, { marginTop: 0, paddingVertical: 4, borderColor: '#16A34A', backgroundColor: '#F0FDF4', alignItems: 'center' }]}>
                    <Text style={[styles.metaText, { flex: 0, width: 45, fontWeight: '800', color: '#16A34A' }]}>{lang === 'hi' ? 'किलो' : 'KG'}:</Text>
                    <TextInput
                      style={[styles.cancelInput, { minHeight: 30, fontWeight: '900', fontSize: 16, color: '#065F46' }]}
                      value={editQty[item._id] || ''}
                      onChangeText={(txt) => setEditQty(prev => ({ ...prev, [item._id]: txt.replace(/[^0-9.]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="500"
                    />
                  </View>
                  <View style={[styles.cancelBox, { marginTop: 0, paddingVertical: 4, borderColor: '#D97706', backgroundColor: '#FFFBEB', alignItems: 'center' }]}>
                    <Text style={[styles.metaText, { flex: 0, width: 45, fontWeight: '800', color: '#D97706' }]}>{lang === 'hi' ? '₹/किलो' : '₹/KG'}:</Text>
                    <TextInput
                      style={[styles.cancelInput, { minHeight: 30, fontWeight: '900', fontSize: 16, color: '#B45309' }]}
                      value={editPrice[item._id] || ''}
                      onChangeText={(txt) => setEditPrice(prev => ({ ...prev, [item._id]: txt.replace(/[^0-9.]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="20"
                    />
                  </View>
                </View>
              ) : (
                <>
                  {item.farmerMobile && !isPending && (
                    <View style={styles.row}>
                      <Ionicons name="call-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{item.farmerMobile}</Text>
                    </View>
                  )}

                  {isPending && (
                    <View style={styles.row}>
                      <Ionicons name="call-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>**********</Text>
                    </View>
                  )}

                  {(item.pricePerQuintal > 0 || item.pricePerKg > 0) ? (
                    <View style={styles.row}>
                      <Ionicons name="cash-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>
                        {t.pricePerQtl}: <Text style={styles.bold}>₹{item.pricePerQuintal}</Text>
                        {' • '}{t.pricePerKg}: <Text style={styles.bold}>₹{item.pricePerKg}</Text>
                      </Text>
                    </View>
                  ) : null}
                </>
              )}

              {item.amount && item.amount > 0 ? (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 10 }}>
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <Text style={styles.metaText}>{t.totalAmount}:</Text>
                    <Text style={[styles.bold, { color: '#374151' }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.row, { justifyContent: 'space-between', marginTop: 4 }]}>
                    <Text style={styles.metaText}>{t.commission} ({item.commissionRate || 0}%):</Text>
                    <Text style={[styles.bold, { color: '#EF4444' }]}>+ ₹{(item.commission || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.row, { justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                    <Text style={[styles.bold, { color: '#111827' }]}>{t.netPayout}:</Text>
                    <Text style={[styles.bold, { color: '#16A34A', fontSize: 14 }]}>₹{( (item.amount || 0) + (item.commission || 0) ).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {item.note ? (
            <View style={[styles.row, { marginTop: 6 }]}>
              <Ionicons name="document-text-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{t.note}: {item.note}</Text>
            </View>
          ) : null}

          <View style={[styles.row, { marginTop: 4 }]}>
            <Ionicons name="time-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{t.assignedAt}: {formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={styles.paymentInfo}>{t.paymentInfo}</Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.btnRow}>
            {isPending && item.assignedStatus === 'new' && (
              <TouchableOpacity
                style={[styles.smallBtn, styles.okBtn, isUpdating && { opacity: 0.6 }]}
                onPress={() => updateStatus(item._id, 'ok')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.smallBtnText}>{t.btnAccept}</Text>
                )}
              </TouchableOpacity>
            )}

            {isAccepted && item.assignedStatus === 'ok' && (
              <>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.deliveredBtn, isUpdating && { opacity: 0.6 }]}
                  onPress={() => updateStatus(item._id, 'delivered')}
                  disabled={isUpdating}
                >
                  <Text style={styles.smallBtnText}>{t.btnDelivered}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, styles.cancelBtn, isUpdating && { opacity: 0.6 }]}
                  onPress={() => updateStatus(item._id, 'cancelled')}
                  disabled={isUpdating}
                >
                  <Text style={styles.smallBtnText}>{t.btnCancel}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {isAccepted && item.sellRequestId && (
            <View style={[styles.cancelBox, { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="key-outline" size={14} color="#0EA5E9" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.cancelInput}
                placeholder={isHindi ? '4 अंकों का OTP दर्ज करें' : 'Enter 4-digit OTP'}
                placeholderTextColor="#9CA3AF"
                value={otps[item._id] || ''}
                onChangeText={(txt) => setOtps((prev) => ({ ...prev, [item._id]: txt }))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          )}

          {isAccepted && (
            <View style={styles.cancelBox}>
              <Ionicons name="create-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.cancelInput}
                placeholder={t.cancelPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={cancelReasons[item._id] || ''}
                onChangeText={(txt) => setCancelReasons((prev) => ({ ...prev, [item._id]: txt }))}
                multiline
              />
            </View>
          )}

          {/* Show cancel reason if cancelled */}
          {item.assignedStatus === 'cancelled' && item.cancelReason ? (
            <View style={[styles.row, { marginTop: 6 }]}>
              <Ionicons name="close-circle-outline" size={12} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: '#EF4444' }]}>Reason: {item.cancelReason}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backWrap} onPress={() => router.push('/(buyer)/home')}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.headerBorder} />

      <View style={styles.subHeader}>
        <Text style={styles.subText}>{t.sub}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            {t.tabPending}
          </Text>
          {orders.filter(o => o.assignedStatus === 'new').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{orders.filter(o => o.assignedStatus === 'new').length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} 
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            {t.tabAccepted}
          </Text>
          {orders.filter(o => o.assignedStatus === 'ok').length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.tabBadgeText}>{orders.filter(o => o.assignedStatus === 'ok').length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]} 
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            {t.tabCompleted}
          </Text>
          {orders.filter(o => o.assignedStatus === 'delivered' || o.assignedStatus === 'cancelled').length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.tabBadgeText}>{orders.filter(o => o.assignedStatus === 'delivered' || o.assignedStatus === 'cancelled').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={orders.filter(o => {
            if (activeTab === 'pending') return o.assignedStatus === 'new';
            if (activeTab === 'accepted') return o.assignedStatus === 'ok';
            if (activeTab === 'completed') return o.assignedStatus === 'delivered' || o.assignedStatus === 'cancelled';
            return false;
          })}
          keyExtractor={(item, index) => item._id || `order-${index}`}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
          contentContainerStyle={
            orders.filter(o => {
              if (activeTab === 'pending') return o.assignedStatus === 'new';
              if (activeTab === 'accepted') return o.assignedStatus === 'ok';
              if (activeTab === 'completed') return o.assignedStatus === 'delivered' || o.assignedStatus === 'cancelled';
              return false;
            }).length === 0
              ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }
              : { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 6, gap: 12 }
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t.empty}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF' },
  backWrap: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6', marginRight: 8 },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  headerBorder: { height: 2, backgroundColor: '#87D528' },

  subHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8 },
  subText: { fontSize: 12, color: '#6B7280' },
  countText: { fontSize: 13, fontWeight: '800', color: '#374151' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  cardOuter: {
    borderRadius: 20, padding: 1.5,
    backgroundColor: 'rgba(34,197,94,0.15)' },
  cardInner: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  imageWrap: {
    width: 60, height: 60, borderRadius: 14,
    overflow: 'hidden', backgroundColor: '#F3F4F6' },
  image: { width: '100%', height: '100%' },

  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2 },
  farmerName: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1 },
  badge: {
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { fontSize: 12, color: '#6B7280', flex: 1 },
  bold: { fontWeight: '700', color: '#374151' },

  paymentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  paymentInfo: { fontSize: 11, color: '#16A34A' },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 6 },
  smallBtn: {
    flex: 1, borderRadius: 999, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  okBtn: { backgroundColor: '#22C55E' },
  deliveredBtn: { backgroundColor: '#2563EB' },
  cancelBtn: { backgroundColor: '#EF4444' },

  cancelBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 10, paddingVertical: 6,
    marginTop: 10, backgroundColor: '#F9FAFB' },
  cancelInput: {
    flex: 1, fontSize: 12, color: '#111827',
    minHeight: 40, textAlignVertical: 'top' },

  emptyContainer: { alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 6 },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'relative' },
  activeTab: {
    backgroundColor: '#87D528' },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    textAlign: 'center' },
  activeTabText: {
    color: '#000000' },
  tabBadge: {
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    position: 'absolute',
    top: -4,
    right: -4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 2,
    zIndex: 10 },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF' } });

