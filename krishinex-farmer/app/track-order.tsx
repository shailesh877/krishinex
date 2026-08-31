// app/track-order.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '@/context/I18nContext';
import { authApi, BASE_URL } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const KHETIFY_GREEN_DARK = '#467804ff';

export default function TrackOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const res = await authApi.getShopOrderById(id as string);
        setOrder(res.data);
      } catch (error) {
        console.error('Fetch order details failed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const t = {
    title: hi ? 'ऑर्डर ट्रैक करें' : 'Track order',
    orderId: hi ? 'ऑर्डर आईडी' : 'Order ID',
    statusNew: hi ? 'ऑर्डर प्राप्त हुआ' : 'Order received',
    statusProcessing: hi ? 'तैयार किया जा रहा है' : 'Preparation in progress',
    statusOut: hi ? 'डिलीवरी पर है' : 'Out for delivery',
    statusDelivered: hi ? 'डिलीवर हो गया' : 'Delivered',
    statusCancelled: hi ? 'रद्द कर दिया गया' : 'Cancelled',
    eta: hi ? 'अनुमानित समय' : 'Estimated time',
    mins: hi ? 'मिनट' : 'mins',
    steps: [
      hi ? 'ऑर्डर कन्फर्म हुआ' : 'Order confirmed',
      hi ? 'दुकान ने पैक कर दिया' : 'Shop has packed your order',
      hi ? 'डिलीवरी पार्टनर रास्ते में' : 'Delivery partner is on the way',
      hi ? 'डिलीवर कर दिया जाएगा' : 'Will be delivered to you',
    ],
    contactShop: hi ? 'दुकान से बात करें' : 'Contact shop',
    contactRider: hi ? 'डिलीवरी से बात करें' : 'Contact rider',
    backHome: hi ? 'होम पर जाएं' : 'Back to home',
    downloadInvoice: hi ? 'इनवॉइस डाउनलोड करें' : 'Download Tax Invoice',
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={KHETIFY_GREEN_DARK} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{hi ? 'ऑर्डर नहीं मिला' : 'Order not found'}</Text>
      </View>
    );
  }

  const getStatusInfo = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') {
      return { label: t.statusDelivered, icon: 'checkmark-circle-outline' as const, color: KHETIFY_GREEN_DARK, step: 4 };
    }
    if (s === 'IN_PROGRESS' || s === 'OUT_FOR_DELIVERY') {
      return { label: t.statusOut, icon: 'bicycle-outline' as const, color: '#2563EB', step: 3 };
    }
    if (s === 'ACCEPTED') {
      return { label: t.statusProcessing, icon: 'cube-outline' as const, color: '#10B981', step: 2 };
    }
    if (s === 'NEW') {
      return { label: t.statusNew, icon: 'time-outline' as const, color: '#F97316', step: 1 };
    }
    return { label: t.statusCancelled, icon: 'close-circle-outline' as const, color: '#DC2626', step: 0 };
  };

  const statusInfo = getStatusInfo(order.status);
  const displayId = order._id.slice(-6).toUpperCase();
  const etaMinutes = order.estimatedDeliveryTime;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appbar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>{t.title}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconWrap}>
              <Ionicons
                name={statusInfo.icon}
                size={22}
                color={statusInfo.color}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              <Text style={styles.statusSub}>
                {hi
                  ? `ऑर्डर स्थिति: ${statusInfo.label}`
                  : `Order Status: ${statusInfo.label}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.orderIdLabel}>{t.orderId}</Text>
              <Text style={styles.orderIdValue}>#{displayId}</Text>
            </View>
          </View>

          {etaMinutes ? (
            <View style={styles.etaRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.etaText}>
                {t.eta}: {etaMinutes} {t.mins}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ordered Items Details Card */}
        <View style={styles.itemsCard}>
          <View style={styles.itemsHeader}>
            <Ionicons name="basket-outline" size={18} color={KHETIFY_GREEN_DARK} />
            <Text style={styles.itemsTitle}>{hi ? 'ऑर्डर किए गए उत्पाद' : 'Ordered Items'}</Text>
          </View>
          
          {order.items && order.items.map((item: any, idx: number) => {
            const itemTotal = (item.price * item.quantity);
            const gstPercent = (item.cgstPercent || 0) + (item.sgstPercent || 0);
            const hasGst = item.gstAmount > 0 || gstPercent > 0;

            return (
              <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.variantLabel ? (
                    <Text style={styles.itemVariant}>{item.variantLabel}</Text>
                  ) : null}
                  <Text style={styles.itemQtyPrice}>
                    {item.quantity} {item.unit || 'pcs'} x ₹{item.price}
                  </Text>
                  {hasGst ? (
                    <Text style={styles.itemTaxText}>
                      {hi ? `GST (${gstPercent}%): शामिल` : `GST (${gstPercent}%): Included`}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.itemPriceWrap}>
                  <Text style={styles.itemTotalPrice}>₹{itemTotal}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.divider} />

          {order.discountApplied ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{hi ? 'कुल मूल्य' : 'Subtotal'}</Text>
                <Text style={styles.summaryValue}>₹{order.totalAmount + order.discountApplied}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#16A34A' }]}>{hi ? 'छूट' : 'Discount Applied'}</Text>
                <Text style={[styles.summaryValue, { color: '#16A34A', fontWeight: '700' }]}>- ₹{order.discountApplied}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontSize: 13, color: '#111827', fontWeight: '700' }]}>{hi ? 'कुल भुगतान राशि' : 'Net Payable Amount'}</Text>
            <Text style={[styles.summaryValue, { fontSize: 14, color: KHETIFY_GREEN_DARK, fontWeight: '800' }]}>₹{order.totalAmount}</Text>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={styles.summaryLabel}>{hi ? 'भुगतान का प्रकार' : 'Payment Mode'}</Text>
            <Text style={[styles.summaryValue, { fontWeight: '700', color: '#4B5563' }]}>
              {order.paymentMode === 'WALLET' ? (hi ? 'वॉलेट' : 'WALLET') : (hi ? 'कैश ऑन डिलीवरी' : 'CASH ON DELIVERY')}
            </Text>
          </View>
        </View>

        {/* timeline (Order Status) */}
        <View style={styles.timelineCard}>
          {t.steps.map((step, index) => {
            const done = index + 1 <= statusInfo.step;
            return (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.bullet,
                      done && styles.bulletDone,
                    ]}
                  >
                    {done && (
                      <Ionicons
                        name="checkmark"
                        size={10}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  {index < t.steps.length - 1 && (
                    <View
                      style={[
                        styles.connector,
                        done && styles.connectorDone,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text
                    style={[
                      styles.timelineText,
                      done && styles.timelineTextDone,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* action buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => {
              const phone = order.owner?.phone;
              if (phone) {
                Linking.openURL(`tel:${phone}`);
              }
            }}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color="#16A34A"
            />
            <Text style={styles.actionText}>{t.contactShop}</Text>
          </TouchableOpacity>

          {order.status === 'DELIVERED' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: KHETIFY_GREEN_DARK, borderWidth: 1, backgroundColor: isDownloading ? '#F3F4F6' : '#F9FAFB' }]}
              disabled={isDownloading}
              onPress={async () => {
                try {
                  setIsDownloading(true);
                  const token = await AsyncStorage.getItem('userToken');
                  const timestamp = new Date().getTime();
                  const invoiceUrl = `${BASE_URL}/shop/orders/${order._id}/invoice?token=${token}&v=${timestamp}`;
                  
                  console.log(`[USERAPP] Triggering invoice download: ${invoiceUrl}`);
                  await WebBrowser.openBrowserAsync(invoiceUrl);
                  
                  setTimeout(() => setIsDownloading(false), 2000);
                } catch (error) {
                  console.error('Invoice download failed:', error);
                  setIsDownloading(false);
                  showAlert('Error', 'Failed to download invoice');
                }
              }}
            >
              <Ionicons
                name={isDownloading ? "time-outline" : "download-outline"}
                size={18}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={[styles.actionText, { color: KHETIFY_GREEN_DARK }]}>
                {isDownloading ? (hi ? 'डाउनलोड हो रहा है...' : 'Downloading...') : t.downloadInvoice}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)/shop')}
        >
          <Text style={styles.homeBtnText}>{t.backHome}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  appbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  topCard: {
    margin: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  statusSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  orderIdLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  orderIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  etaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },

  timelineCard: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  bullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletDone: {
    backgroundColor: KHETIFY_GREEN_DARK,
    borderColor: KHETIFY_GREEN_DARK,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 2,
    backgroundColor: '#E5E7EB',
  },
  connectorDone: {
    backgroundColor: '#4ADE80',
  },
  timelineTextWrap: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  timelineTextDone: {
    color: '#111827',
    fontWeight: '600',
  },

  itemsCard: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  itemsTitle: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemVariant: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemQtyPrice: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '600',
  },
  itemTaxText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 2,
  },
  itemPriceWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  itemTotalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  actionsCard: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 4,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  bottom: {
    marginTop: 16,
    paddingHorizontal: 14,
  },
  homeBtn: {
    borderRadius: 999,
    backgroundColor: KHETIFY_GREEN_DARK,
    paddingVertical: 10,
    alignItems: 'center',
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
