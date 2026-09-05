// app/shop-tabs/accept.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  ScrollView,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ActivityIndicator } from 'react-native';

import { BASE_API_URL, BASE_URL, FILES_BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/shop`;

const getImageUrl = (url: string) => {
  if (!url || url.includes('pexels-photo')) return null;
  if (url.startsWith('http')) return url;
  return `${FILES_BASE_URL}/${url.replace(/\\/g, '/')}`;
};
 // root url used for images too

type AcceptStatus = 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED';

type Order = {
  id: string;
  displayId?: string;
  customer: string;
  phone: string;
  location: string;
  items: string;
  amount: number;
  time: string;
  status: AcceptStatus;
  imageUrl: string;
  rawItems: any[];
  deliveryAddress: any;
  paymentMode: string;
};

type TopTabKey = 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED';

export default function ShopAccept() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [tab, setTab] = React.useState<TopTabKey>('ACCEPTED');
  const [loading, setLoading] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // OTP Delivery state
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
      const interval = setInterval(() => fetchOrders(), 5000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((order: any) => {
          let itemsText = 'Items';
          let imageUrl = 'https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg'; // fallback
          if (order.items && order.items.length > 0) {
            itemsText = order.items.map((i: any) => {
              const label = i.variantLabel ? `(${i.variantLabel})` : '';
              return `${i.name} ${label} x ${i.quantity}`;
            }).join(', ');
            imageUrl = getImageUrl(order.items[0].imageUrl) || '';
          }
          const dt = new Date(order.createdAt);
          return {
            id: order._id,
            displayId: order._id.substring(order._id.length - 6).toUpperCase(),
            customer: order.buyer ? order.buyer.name : 'Customer',
            phone: order.buyer ? order.buyer.phone : 'N/A',
            location: order.buyer ? order.buyer.address || order.buyer.location : 'N/A',
            items: itemsText,
            amount: order.totalAmount,
            time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: order.status,
            imageUrl,
            rawItems: order.items || [],
            deliveryAddress: order.deliveryAddress || {},
            paymentMode: order.paymentMode || 'CASH'
          };
        });
        setOrders(mapped);
      }
    } catch (e) {
      console.error('Fetch orders error', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: AcceptStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        showAlert('Error', 'Failed to update order status');
      }
    } catch (e) {
      console.error('Update status error', e);
    }
  };

  // Replaced with dynamic updateStatus function above

  const sendDeliveryOtp = async (orderId: string) => {
    try {
      setIsSendingOtp(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/orders/${orderId}/send-delivery-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setOtpOrderId(orderId);
        setDeliveryOtp('');
        setOtpModalVisible(true);
        showAlert(
          isHindi ? 'OTP भेजा गया' : 'OTP Sent',
          isHindi ? 'ग्राहक के फोन पर OTP भेज दिया गया है। उनसे OTP लें और यहां दर्ज करें।' : 'OTP has been sent to the buyer. Ask them for the OTP and enter it here.'
        );
      } else {
        const err = await res.json();
        showAlert('Error', err.error || 'Failed to send OTP');
      }
    } catch (e) {
      showAlert('Error', 'Network error while sending OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyDeliveryOtp = async () => {
    if (!otpOrderId || deliveryOtp.length < 6) return;
    try {
      setIsVerifyingOtp(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/orders/${otpOrderId}/verify-delivery-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: deliveryOtp })
      });
      if (res.ok) {
        setOtpModalVisible(false);
        setModalVisible(false);
        showAlert(
          isHindi ? 'डिलीवरी कन्फर्म' : 'Delivery Confirmed',
          isHindi ? 'ऑर्डर सफलतापूर्वक Delivered मार्क हो गया!' : 'Order has been successfully marked as Delivered!'
        );
        fetchOrders();
      } else {
        const err = await res.json();
        showAlert(isHindi ? 'गलत OTP' : 'Invalid OTP', err.error || 'OTP verification failed');
      }
    } catch (e) {
      showAlert('Error', 'Network error while verifying OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const acceptedList = orders.filter(o => o.status === 'ACCEPTED');
  const inProgressList = orders.filter(o => o.status === 'IN_PROGRESS');
  const deliveredList = orders.filter(o => o.status === 'DELIVERED');

  let data: Order[] = [];
  if (tab === 'ACCEPTED') data = acceptedList;
  else if (tab === 'IN_PROGRESS') data = inProgressList;
  else data = deliveredList;

  const renderStatus = (status: AcceptStatus) => {
    let label = '';
    let color = '';
    let bg = '';

    if (status === 'ACCEPTED') {
      label = isHindi ? 'Accepted' : 'Accepted';
      color = '#15803D'; // dark green
      bg = '#BBF7D0'; // light green
    } else if (status === 'IN_PROGRESS') {
      label = isHindi ? 'On the way' : 'On the way';
      color = '#16A34A';
      bg = '#DCFCE7';
    } else {
      label = isHindi ? 'Delivered' : 'Delivered';
      color = '#166534';
      bg = '#DCFCE7';
    }

    return (
      <View style={[styles.statusChip, { backgroundColor: bg }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderActions = (order: Order) => {
    if (order.status === 'DELIVERED') return null;

    // Accepted → On the way (IN_PROGRESS)
    if (order.status === 'ACCEPTED') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionBtn, styles.progressBtn]}
            onPress={() => updateStatus(order.id, 'IN_PROGRESS')}
          >
            <Ionicons
              name="bicycle-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.actionText}>
              {isHindi ? 'On the way' : 'On the way'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // In progress → Delivered (requires OTP)
    if (order.status === 'IN_PROGRESS') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionBtn, styles.deliverBtn]}
            onPress={() => sendDeliveryOtp(order.id)}
            disabled={isSendingOtp}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.actionText}>
              {isSendingOtp ? '...' : (isHindi ? 'Delivered मार्क करें' : 'Mark delivered')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const acceptedLabel = isHindi ? 'Accepted' : 'Accepted';
  const inProgressLabel = isHindi ? 'In progress' : 'In progress';
  const deliveredLabel = isHindi ? 'Delivered' : 'Delivered';

  return (
    <View style={styles.root}>
     SafeAreaViewatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HOME जैसा header style, अब green accent */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeftRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="checkmark-done-outline" size={18} color="#16A34A" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>
              {isHindi ? 'ऑर्डर स्टेटस' : 'Order status'}
            </Text>
            <Text style={styles.headerSub}>
              {isHindi
                ? 'Accepted, On the way और Delivered ऑर्डर यहां देखें'
                : 'View accepted, on the way and delivered orders'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(shop-partner)/notifications' as any)}>
          <NotificationIcon size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Top chips – 3 tabs, green theme */}
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[
            styles.chipTab,
            tab === 'ACCEPTED' && styles.chipTabActive,
          ]}
          onPress={() => setTab('ACCEPTED')}
        >
          <Text
            style={[
              styles.chipTabText,
              tab === 'ACCEPTED' && styles.chipTabTextActive,
            ]}
          >
            {acceptedLabel}
          </Text>
          <View style={styles.chipCount}>
            <Text style={styles.chipCountText}>{acceptedList.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chipTab,
            tab === 'IN_PROGRESS' && styles.chipTabActive,
          ]}
          onPress={() => setTab('IN_PROGRESS')}
        >
          <Text
            style={[
              styles.chipTabText,
              tab === 'IN_PROGRESS' && styles.chipTabTextActive,
            ]}
          >
            {inProgressLabel}
          </Text>
          <View style={styles.chipCount}>
            <Text style={styles.chipCountText}>{inProgressList.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chipTab,
            tab === 'DELIVERED' && styles.chipTabActive,
          ]}
          onPress={() => setTab('DELIVERED')}
        >
          <Text
            style={[
              styles.chipTabText,
              tab === 'DELIVERED' && styles.chipTabTextActive,
            ]}
          >
            {deliveredLabel}
          </Text>
          <View style={styles.chipCount}>
            <Text style={styles.chipCountText}>{deliveredList.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={styles.card}
            onPress={() => {
              setSelectedOrder(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.cardTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color="#6B7280"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.orderIdText}>{item.displayId || item.id}</Text>
              </View>
              <View style={styles.topRight}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#6B7280"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.metaText}>{item.time}</Text>
                <Text style={styles.amountText}>₹ {item.amount}</Text>
              </View>
            </View>

            <View style={styles.middleRow}>
              {item.imageUrl ? (
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productImage}
                  />
                </View>
              ) : null}

              <View style={{ flex: 1 }}>
                <Text style={styles.itemsText} numberOfLines={2}>
                  {item.items}
                </Text>
                <Text style={styles.customerName}>{item.customer}</Text>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.infoText}>{item.phone}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardBottomRow}>
              {renderStatus(item.status)}
              {renderActions(item)}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="checkmark-done-outline"
              size={26}
              color="#9CA3AF"
            />
            <Text style={styles.emptyTitle}>
              {tab === 'ACCEPTED'
                ? isHindi
                  ? 'कोई accepted ऑर्डर नहीं'
                  : 'No accepted orders'
                : tab === 'IN_PROGRESS'
                  ? isHindi
                    ? 'कोई in progress ऑर्डर नहीं'
                    : 'No in progress orders'
                  : isHindi
                    ? 'कोई delivered ऑर्डर नहीं'
                    : 'No delivered orders'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'ACCEPTED'
                ? isHindi
                  ? 'Accept किए गए ऑर्डर यहां दिखेंगे.'
                  : 'Orders you accept will appear here.'
                : tab === 'IN_PROGRESS'
                  ? isHindi
                    ? 'On the way वाले ऑर्डर यहां दिखेंगे.'
                    : 'Orders on the way will appear here.'
                  : isHindi
                    ? 'Delivered मार्क किए गए ऑर्डर यहां दिखेंगे.'
                    : 'Orders marked delivered will appear here.'}
            </Text>
          </View>
        }
      />

      {/* ORDER DETAILS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isHindi ? 'ऑर्डर विवरण' : 'Order Details'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Status & ID */}
                <View style={styles.modalSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.modalLabel}>{isHindi ? 'ऑर्डर ID:' : 'Order ID:'} {selectedOrder.displayId}</Text>
                    {renderStatus(selectedOrder.status)}
                  </View>
                  <Text style={styles.modalTime}>{selectedOrder.time}</Text>
                </View>

                {/* Buyer Info */}
                <View style={[styles.modalSection, styles.borderTop]}>
                  <Text style={styles.sectionTitle}>{isHindi ? 'किसान / ग्राहक' : 'Farmer / Customer'}</Text>
                  <Text style={styles.detailName}>{selectedOrder.customer}</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{selectedOrder.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {selectedOrder.deliveryAddress?.fullAddress || selectedOrder.location}
                    </Text>
                  </View>
                  {selectedOrder.deliveryAddress?.note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>Note: {selectedOrder.deliveryAddress.note}</Text>
                    </View>
                  )}
                </View>

                {/* Items List */}
                <View style={[styles.modalSection, styles.borderTop]}>
                  <Text style={styles.sectionTitle}>{isHindi ? 'आइटम सूची' : 'Items List'}</Text>
                  {selectedOrder.rawItems.map((it, idx) => (
                    <View key={idx} style={styles.itemDetailRow}>
                      {getImageUrl(it.imageUrl) ? (
                        <Image 
                          source={{ uri: getImageUrl(it.imageUrl) as string }} 
                          style={styles.itemThumb} 
                        />
                      ) : (
                        <View style={[styles.itemThumb, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="cart-outline" size={16} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNameText}>{it.name} {it.variantLabel ? `(${it.variantLabel})` : ''}</Text>
                        <Text style={styles.itemQtyText}>{it.quantity} x ₹{it.price}</Text>
                      </View>
                      <Text style={styles.itemTotalText}>₹{it.quantity * it.price}</Text>
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{isHindi ? 'कुल राशि:' : 'Total Amount:'}</Text>
                    <Text style={styles.totalVal}>₹{selectedOrder.amount}</Text>
                  </View>
                  <Text style={styles.paymentTag}>
                    {isHindi ? 'भुगतान:' : 'Payment:'} {selectedOrder.paymentMode}
                  </Text>
                </View>

                {/* Quick Actions (only if applicable) */}
                <View style={styles.modalActions}>
                  {selectedOrder.status === 'ACCEPTED' && (
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: '#16A34A' }]} 
                      onPress={() => {
                        setModalVisible(false);
                        updateStatus(selectedOrder.id, 'IN_PROGRESS');
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                        {isHindi ? 'On the way मार्क करें' : 'Mark On the way'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedOrder.status === 'IN_PROGRESS' && (
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: '#15803D' }]} 
                      onPress={() => {
                        setModalVisible(false);
                        sendDeliveryOtp(selectedOrder.id);
                      }}
                      disabled={isSendingOtp}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                        {isSendingOtp ? '...' : (isHindi ? 'Delivered मार्क करें' : 'Mark Delivered')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* DELIVERY OTP MODAL */}
      <Modal visible={otpModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
            <View style={styles.otpCard}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#15803D" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.otpTitle}>
                {isHindi ? 'डिलीवरी OTP' : 'Delivery OTP'}
              </Text>
              <Text style={styles.otpSub}>
                {isHindi
                  ? 'ग्राहक के फोन पर OTP भेजा गया है। उनसे OTP लेकर यहां दर्ज करें।'
                  : 'An OTP has been sent to the buyer. Ask them for the OTP and enter it below.'}
              </Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={deliveryOtp}
                onChangeText={setDeliveryOtp}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.otpBtn, isVerifyingOtp && { opacity: 0.6 }]}
                onPress={verifyDeliveryOtp}
                disabled={isVerifyingOtp || deliveryOtp.length < 6}
              >
                {isVerifyingOtp
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.otpBtnText}>{isHindi ? 'कन्फर्म करें' : 'Confirm Delivery'}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)} style={{ marginTop: 15, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', fontWeight: '700' }}>{isHindi ? 'कैंसल' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );SafeAreaView
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
    justifyContent: 'space-between' },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center' },

  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' },
  chipTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#F9FAFB' },
  chipTabActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A' },
  chipTabText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600' },
  chipTabTextActive: {
    color: '#166534' },
  chipCount: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFFFFF' },
  chipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827' },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  orderIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827' },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center' },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    marginRight: 8 },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827' },

  middleRow: {
    marginTop: 10,
    flexDirection: 'row' },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    overflow: 'hidden' },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover' },

  itemsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827' },
  customerName: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    flexShrink: 1 },

  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4 },
  statusText: {
    fontSize: 11,
    fontWeight: '600' },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999 },
  progressBtn: {
    backgroundColor: '#16A34A' },
  deliverBtn: {
    backgroundColor: '#15803D' },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF' },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center' },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827' },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 24 },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6' },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827' },
  modalScroll: {
    padding: 20 },
  modalSection: {
    marginBottom: 20 },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563' },
  modalTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2 },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8 },
  detailText: {
    fontSize: 14,
    color: '#4B5563' },
  noteBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B' },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic' },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12 },
  itemThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6' },
  itemNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827' },
  itemQtyText: {
    fontSize: 12,
    color: '#6B7280' },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6' },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827' },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16A34A' },
  paymentTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' },
  otpCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 30,
    borderRadius: 24,
    padding: 28,
    alignSelf: 'stretch' },
  otpTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 8 },
  otpSub: {
    fontSize: 13,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 20 },
  otpInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 18,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: '#111827' },
  otpBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center' },
  otpBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' } });
