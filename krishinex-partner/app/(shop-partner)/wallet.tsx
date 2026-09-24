import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { showAlert } from '../../components/CustomAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}/shop`;
const WALLET_RECHARGE_URL = `${BASE_API_URL}/wallet`;

import RazorpayCheckout from 'react-native-razorpay';
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID as string;
const GREEN = '#16A34A';

type Transaction = {
  _id: string;
  transactionId: string;
  amount: number;
  type: 'Payout' | 'Collection' | 'Credit' | 'Debit';
  paymentMode: string;
  status: 'Pending' | 'Completed' | 'Failed';
  module: string;
  note: string;
  createdAt: string;
};

export default function ShopWallet() {
  const router = useRouter();
  const { lang } = useI18n();

  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recharge modal state
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const hi = lang === 'hi';

  const t = {
    hi: {
      title: 'वॉलेट और कमाई',
      balanceLabel: 'कुल बैलेंस',
      transactionsLabel: 'हाल के लेन-देन',
      payout: 'पेआउट (क्रेडिट)',
      collection: 'कलेक्शन (डेबिट)',
      recharge: 'वॉलेट रिचार्ज करें',
      status: { Pending: 'प्रतीक्षारत', Completed: 'सफल', Failed: 'विफल' },
      empty: 'अभी तक कोई लेन-देन नहीं है',
    },
    en: {
      title: 'Wallet & Earnings',
      balanceLabel: 'Total Balance',
      transactionsLabel: 'Recent Transactions',
      payout: 'Payout (Credit)',
      collection: 'Collection (Debit)',
      recharge: 'Recharge Wallet',
      status: { Pending: 'Pending', Completed: 'Completed', Failed: 'Failed' },
      empty: 'No transactions yet',
    },
  }[lang];

  const fetchWallet = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setUserName(data.name || '');
        setTransactions(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.transactions)) return data.transactions;
          return prev;
        });
      }
    } catch (e) {
      console.error('Wallet fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWallet(false);
      const interval = setInterval(() => fetchWallet(true), 5000);
      return () => clearInterval(interval);
    }, [fetchWallet])
  );

  const onRefresh = () => { setRefreshing(true); fetchWallet(false); };

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < 10) {
      showAlert(
        hi ? 'त्रुटि' : 'Error',
        hi ? 'कृपया कम से कम ₹10 दर्ज करें' : 'Please enter at least ₹10'
      );
      return;
    }

    setIsRecharging(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Not authenticated');

      const orderRes = await fetch(`${WALLET_RECHARGE_URL}/recharge/create-order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) throw new Error('Failed to create order');

      const options = {
        description: 'Wallet Recharge',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        name: 'KrishiNex',
        order_id: orderData.order.id,
        prefill: { name: userName || 'Partner' },
        theme: { color: GREEN },
      };

      RazorpayCheckout.open(options).then(async (razorData: any) => {
        try {
          const payload = {
            razorpay_payment_id: razorData.razorpay_payment_id || razorData.paymentId,
            razorpay_order_id: razorData.razorpay_order_id || razorData.order_id,
            razorpay_signature: razorData.razorpay_signature || razorData.signature,
            amount,
          };
          const verifyRes = await fetch(`${WALLET_RECHARGE_URL}/recharge/verify`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showAlert(hi ? 'सफल' : 'Success', hi ? 'वॉलेट रिचार्ज सफल रहा' : 'Wallet recharge successful');
            setRechargeModalVisible(false);
            setRechargeAmount('');
            fetchWallet(false);
          } else {
            showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'भुगतान सत्यापन विफल' : 'Payment verification failed');
          }
        } catch (verErr) {
          showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'भुगतान सत्यापन विफल' : 'Payment verification failed');
        }
      }).catch((error: any) => {
        const errorMsg = error?.description || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? `भुगतान विफल या रद्द किया गया: ${errorMsg}` : `Payment failed or cancelled: ${errorMsg}`);
      });
    } catch (error) {
      console.log('Recharge error:', error);
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'रिचार्ज शुरू करने में विफल' : 'Failed to initiate recharge');
    } finally {
      setIsRecharging(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isPayout = item.type === 'Payout' || item.type === 'Credit';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: isPayout ? '#F0FDF4' : '#FFF7ED' }]}>
            <Ionicons
              name={isPayout ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
              size={24}
              color={isPayout ? '#16A34A' : '#F97316'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeText}>{isPayout ? t.payout : t.collection}</Text>
            <Text style={styles.idText}>ID: {item.transactionId}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.amountWrap}>
            <Text style={[styles.amountText, { color: isPayout ? '#16A34A' : '#EF4444' }]}>
              {isPayout ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#DCFCE7' : '#F3F4F6' }]}>
              <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#166534' : '#6B7280' }]}>
                {t.status[item.status]}
              </Text>
            </View>
          </View>
        </View>
        {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <LinearGradient colors={['#16A34A', '#15803D']} style={styles.topSection}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceSub}>{t.balanceLabel}</Text>
          <Text style={styles.balanceValue}>₹ {balance.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={styles.rechargeBtn}
          onPress={() => setRechargeModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={18} color="#16A34A" />
          <Text style={styles.rechargeBtnText}>{t.recharge}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Text style={styles.sectionTitle}>{t.transactionsLabel}</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={false}
          data={transactions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN]} />}
          contentContainerStyle={
            transactions.length === 0
              ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }
              : { paddingHorizontal: 16, paddingBottom: 24, gap: 10 }
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t.empty}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* RECHARGE MODAL */}
      <Modal visible={rechargeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{hi ? 'रिचार्ज राशि दर्ज करें' : 'Enter Recharge Amount'}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="₹ 0"
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRechargeModalVisible(false)}
                disabled={isRecharging}
              >
                <Text style={styles.modalCancelText}>{hi ? 'रद्द करें' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isRecharging && { opacity: 0.7 }]}
                onPress={handleRecharge}
                disabled={isRecharging}
              >
                {isRecharging
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.modalSubmitText}>{hi ? 'रिचार्ज करें' : 'Recharge'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  topSection: { paddingBottom: 24, paddingHorizontal: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  balanceCard: { alignItems: 'center', marginBottom: 16 },
  balanceSub: { fontSize: 14, color: '#D1FAE5', marginBottom: 4 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  rechargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 10, gap: 6, marginTop: 4 },
  rechargeBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  typeText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  idText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  dateText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  amountWrap: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: '700' },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  noteText: { marginTop: 10, fontSize: 11, color: '#6B7280', fontStyle: 'italic', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
  // Recharge Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 16, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  amountInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#16A34A', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { color: '#4B5563', fontWeight: '700', fontSize: 15 },
  modalSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#16A34A', alignItems: 'center' },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
