// app/shop-tabs/orders.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  Linking,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ActivityIndicator, Modal } from 'react-native';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/shop`;

const getImageUrl = (url: string) => {
  if (!url || url.includes('pexels-photo')) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}/${url.replace(/\\/g, '/')}`;
};
 // root url used for images too

type OrderStatus = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';

type OrderItem = {
  id: string;
  displayId?: string;
  customer: string;
  phone: string;
  location: string;
  items: string;
  amount: number;
  time: string;
  status: OrderStatus;
  imageUrl: string;
  rawItems: any[];
  deliveryAddress: any;
  paymentMode: string;
};

export default function ShopOrders() {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<OrderItem | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [timeModalVisible, setTimeModalVisible] = React.useState(false);
  const [estimatedTime, setEstimatedTime] = React.useState('');
  const [acceptingOrderId, setAcceptingOrderId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

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

  const handleDownload = async (type: 'invoice' | 'shipping-label') => {
    if (isDownloading || !selectedOrder) return;
    
    try {
      setIsDownloading(true);
      const token = await AsyncStorage.getItem('userToken');
      const url = `${API_URL}/orders/${selectedOrder.id}/${type}?token=${token}`;
      
      console.log(`[DEBUG] Triggering ${type} download: ${url}`);
      
      // Use WebBrowser for a more controlled experience than Linking
      await WebBrowser.openBrowserAsync(url);
      
      // Keep locked for 2 seconds to prevent ghost clicks
      setTimeout(() => setIsDownloading(false), 2000);
    } catch (error) {
      console.error(`Download error (${type}):`, error);
      setIsDownloading(false);
      showAlert('Error', 'Failed to open download link');
    }
  };

  const fetchOrders = async () => {
    try {
      // if (length === 0) setLoading(true) removed for silent polling
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

  const updateOrderStatus = async (orderId: string, status: string, additionalData = {}) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, ...additionalData })
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

  // sirf NEW orders dikhane hain
  const TODAY_ORDERS = orders.filter(o => o.status === 'NEW');

  const renderStatus = (status: OrderStatus) => {
    let label = '';
    let color = '';
    let bg = '';

    if (status === 'NEW') {
      label = isHindi ? 'नया ऑर्डर' : 'New order';
      color = '#B91C1C';
      bg = '#FEE2E2';
    } else if (status === 'ACCEPTED') {
      label = isHindi ? 'Accept हुआ' : 'Accepted';
      color = '#15803D';
      bg = '#BBF7D0';
    } else {
      label = isHindi ? 'डिलीवर' : 'Delivered';
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

  const renderActions = (status: OrderStatus) => {
    // yaha sirf NEW aayenge, phir bhi safe check
    if (status !== 'NEW') return null;

    return (
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionBtn, styles.cancelBtn]}
          onPress={() => {
            showAlert(
              isHindi ? 'रद्द करें' : 'Cancel Order',
              isHindi ? 'क्या आप इस ऑर्डर को रद्द करना चाहते हैं?' : 'Are you sure you want to cancel this order?',
              [
                { text: isHindi ? 'वापस' : 'Back', style: 'cancel' },
                {
                  text: isHindi ? 'रद्द करें' : 'Cancel',
                  style: 'destructive',
                  onPress: () => updateOrderStatus((arguments[0] as any).id, 'CANCELLED')
                }
              ]
            );
          }}
        >
          <Ionicons
            name="close-circle-outline"
            size={18}
            color="#B91C1C"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.cancelText}>
            {isHindi ? 'कैंसल' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => updateOrderStatus((arguments[0] as any).id, 'ACCEPTED')}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.acceptText}>
            {isHindi ? 'Accept' : 'Accept'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* GREEN PREMIUM HEADER – accept jaisa look */}
      <View style={[styles.appHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeftRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="receipt-outline" size={18} color="#16A34A" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>
              {isHindi ? 'आज के ऑर्डर' : 'Today’s orders'}
            </Text>
            <Text style={styles.headerSub}>
              {isHindi
                ? 'आज आये सभी नए किसान ऑर्डर'
                : 'All new orders received today'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(shop-partner)/notifications' as any)}>
          <NotificationIcon size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={orders}
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
            {/* TOP: order id + time + amount */}
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

            {/* MIDDLE: product image + order + customer info */}
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

                <TouchableOpacity 
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color="#16A34A"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.infoText, { color: '#16A34A', fontWeight: '700', textDecorationLine: 'underline' }]}>{item.phone}</Text>
                </TouchableOpacity>

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

            {/* BOTTOM: status + actions */}
            <View style={styles.cardBottomRow}>
              {renderStatus(item.status)}
              {(() => {
                const handleCancel = () => {
                  showAlert(
                    isHindi ? 'रद्द करें' : 'Cancel Order',
                    isHindi ? 'क्या आप इस ऑर्डर को रद्द करना चाहते हैं?' : 'Are you sure you want to cancel this order?',
                    [
                      { text: isHindi ? 'वापस' : 'Back', style: 'cancel' },
                      {
                        text: isHindi ? 'रद्द करें' : 'Cancel',
                        style: 'destructive',
                        onPress: () => updateOrderStatus(item.id, 'CANCELLED')
                      }
                    ]
                  );
                };
                const handleAccept = () => {
                  setAcceptingOrderId(item.id);
                  setTimeModalVisible(true);
                };

                if (item.status !== 'NEW') return null;

                return (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
                      <Ionicons name="close-circle-outline" size={18} color="#B91C1C" style={{ marginRight: 4 }} />
                      <Text style={styles.cancelText}>{isHindi ? 'कैंसल' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.acceptText}>{isHindi ? 'Accept' : 'Accept'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="document-text-outline"
              size={26}
              color="#9CA3AF"
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई नया ऑर्डर नहीं' : 'No new orders'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'आज आने वाले सभी नए ऑर्डर यहां दिखेंगे.'
                : 'New orders received today will appear here.'}
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
                  <TouchableOpacity 
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(`tel:${selectedOrder.phone}`)}
                  >
                    <Ionicons name="call" size={14} color="#16A34A" />
                    <Text style={[styles.detailText, { color: '#16A34A', fontWeight: '700', textDecorationLine: 'underline' }]}>{selectedOrder.phone}</Text>
                  </TouchableOpacity>
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

                {/* Quick Actions */}
                <View style={styles.modalActions}>
                  {selectedOrder.status === 'NEW' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.modalBtn, styles.modalCancelBtn]} 
                        onPress={() => {
                          setModalVisible(false);
                          showAlert(
                            isHindi ? 'रद्द करें' : 'Cancel Order',
                            isHindi ? 'क्या आप इस ऑर्डर को रद्द करना चाहते हैं?' : 'Are you sure you want to cancel this order?',
                            [
                              { text: isHindi ? 'वापस' : 'Back', style: 'cancel' },
                              {
                                text: isHindi ? 'रद्द करें' : 'Cancel',
                                style: 'destructive',
                                onPress: () => updateOrderStatus(selectedOrder.id, 'CANCELLED')
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.modalCancelBtnText}>{isHindi ? 'रद्द करें' : 'Cancel'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalBtn, styles.modalAcceptBtn]} 
                        onPress={() => {
                          setModalVisible(false);
                          setAcceptingOrderId(selectedOrder.id);
                          setTimeModalVisible(true);
                        }}
                      >
                        <Text style={styles.modalAcceptBtnText}>{isHindi ? 'Accept' : 'Accept'}</Text>
                      </TouchableOpacity>
                    </>
                  )}

                   {selectedOrder.status !== 'NEW' && selectedOrder.status !== 'CANCELLED' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.modalBtn, { backgroundColor: isDownloading ? '#6b7280' : '#111827' }]} 
                        disabled={isDownloading}
                        onPress={() => handleDownload('shipping-label')}
                      >
                        <Ionicons name="barcode-outline" size={18} color="#FFFFFF" style={{ marginBottom: 4 }} />
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11, textAlign: 'center' }}>
                          {isDownloading ? (isHindi ? 'डाउनलोड...' : 'Downloading...') : (isHindi ? 'Shipping Label' : 'Shipping Label')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.modalBtn, { backgroundColor: isDownloading ? '#6b7280' : '#16A34A' }]} 
                        disabled={isDownloading}
                        onPress={() => handleDownload('invoice')}
                      >
                        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginBottom: 4 }} />
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11, textAlign: 'center' }}>
                          {isDownloading ? (isHindi ? 'डाउनलोड...' : 'Downloading...') : (isHindi ? 'Tax Invoice' : 'Tax Invoice')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ESTIMATED TIME MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={timeModalVisible}
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 30, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isHindi ? 'डिलीवरी का समय' : 'Delivery Time'}</Text>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 12, fontWeight: '600' }}>
                {isHindi ? 'कितने समय में डिलीवर होगा? (जैसे: 30 mins)' : 'Estimated delivery time? (e.g. 30 mins)'}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#111827',
                  backgroundColor: '#F9FAFB'
                }}
                placeholder={isHindi ? 'समय यहाँ लिखें...' : 'Type time here...'}
                value={estimatedTime}
                onChangeText={setEstimatedTime}
                autoFocus
              />
              <TouchableOpacity
                style={{
                  backgroundColor: '#16A34A',
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                  marginTop: 20,
                }}
                onPress={() => {
                  if (!estimatedTime) {
                    showAlert('Required', isHindi ? 'कृपया समय लिखें' : 'Please enter delivery time');
                    return;
                  }
                  if (acceptingOrderId) {
                    updateOrderStatus(acceptingOrderId, 'ACCEPTED', { estimatedDeliveryTime: estimatedTime });
                  }
                  setTimeModalVisible(false);
                  setEstimatedTime('');
                  setAcceptingOrderId(null);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  {isHindi ? 'Accept और Confirm करें' : 'Confirm & Accept'}
                </Text>
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

  // GREEN top header – same family as accept
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
    justifyContent: 'space-between',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    marginRight: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  middleRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  itemsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  customerName: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    flexShrink: 1,
  },

  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginRight: 8,
  },
  acceptBtn: {
    backgroundColor: '#16A34A',
  },
  cancelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  acceptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalScroll: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic',
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  itemThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemQtyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16A34A',
  },
  paymentTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  modalAcceptBtn: {
    backgroundColor: '#16A34A',
  },
  modalCancelBtnText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  modalAcceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
