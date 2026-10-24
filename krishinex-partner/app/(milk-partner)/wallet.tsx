import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';

const WALLET_RECHARGE_URL = `${BASE_API_URL}/wallet`;
const RAZORPAY_KEY_ID = (process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_Tj1DcreDse1Rkh') as string;

export default function MilkPartnerWalletScreen() {
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [accumulatedAmount, setAccumulatedAmount] = useState(0);
  const [minPartnerWalletBalance, setMinPartnerWalletBalance] = useState(500);
  const [partnerDeliveryCommission, setPartnerDeliveryCommission] = useState(5);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [adminCommissionPercent, setAdminCommissionPercent] = useState(10);
  const [stats, setStats] = useState<any>({
    totalCollectedLiters: 0,
    totalDeliveredLiters: 0,
    totalTransactionsCount: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState<'all' | 'debit' | 'credit'>('all');

  // Recharge Modal State
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_API_URL}/milk/partner/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWalletBalance(data.walletBalance || 0);
        setAccumulatedAmount(data.accumulatedAmount || 0);
        if (data.minPartnerWalletBalance !== undefined) {
          setMinPartnerWalletBalance(data.minPartnerWalletBalance);
        }
        if (data.adminCommissionPercent !== undefined) {
          setAdminCommissionPercent(data.adminCommissionPercent);
        }
        if (data.stats) setStats(data.stats);
        if (data.transactions) setTransactions(data.transactions);
      } else {
        showAlert(
          hi ? 'त्रुटि' : 'Error',
          data.error || (hi ? 'वॉलेट लोड करने में विफल।' : 'Failed to load wallet.')
        );
      }

      // Also grab user name and phone for Razorpay prefill
      const userStr = await AsyncStorage.getItem('userData');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.name) setPartnerName(u.name);
          if (u.phone) setPartnerPhone(u.phone);
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hi]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (isNaN(amount) || amount < 10) {
      showAlert(
        hi ? 'अमान्य राशि' : 'Invalid Amount',
        hi ? 'कृपया कम से कम ₹10 की राशि दर्ज करें।' : 'Please enter at least ₹10.'
      );
      return;
    }

    setIsRecharging(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'प्रमाणीकरण आवश्यक है।' : 'Authentication required.');
        setIsRecharging(false);
        return;
      }

      // 1. Create Razorpay order
      const orderRes = await fetch(`${WALLET_RECHARGE_URL}/recharge/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // 2. Open Razorpay Checkout
      const options = {
        description: 'Milk Partner Wallet Recharge',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        name: 'KrishiNex Milk Services',
        order_id: orderData.order.id,
        prefill: {
          name: partnerName || 'Milk Partner',
          contact: partnerPhone || '',
          email: '',
        },
        theme: { color: '#059669' },
      };

      RazorpayCheckout.open(options).then(async (razorData: any) => {
        try {
          // 3. Verify Payment with Backend
          const payload = {
            razorpay_payment_id: razorData.razorpay_payment_id || razorData.paymentId,
            razorpay_order_id: razorData.razorpay_order_id || razorData.order_id,
            razorpay_signature: razorData.razorpay_signature || razorData.signature,
            amount,
          };

          const verifyRes = await fetch(`${WALLET_RECHARGE_URL}/recharge/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showAlert(
              hi ? 'रिचार्ज सफल' : 'Recharge Successful',
              hi ? `₹${amount} आपके वॉलेट में सफलतापूर्वक जोड़ दिए गए हैं!` : `₹${amount} has been added to your wallet successfully!`
            );
            setRechargeModalVisible(false);
            setRechargeAmount('');
            fetchWalletData();
          } else {
            showAlert(hi ? 'त्रुटि' : 'Error', verifyData.error || (hi ? 'भुगतान सत्यापन विफल रहा।' : 'Payment verification failed.'));
          }
        } catch (verErr: any) {
          showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'भुगतान सत्यापन में समस्या आई।' : 'Payment verification failed.');
        } finally {
          setIsRecharging(false);
        }
      }).catch((error: any) => {
        console.log('Razorpay Error/Cancelled:', error);
        setIsRecharging(false);
        const desc = (error?.description || error?.message || (typeof error === 'string' ? error : '')).toLowerCase();
        const isCancelled = error?.code === 0 || desc.includes('cancel') || desc.includes('dismiss');

        if (isCancelled) {
          showAlert(
            hi ? 'भुगतान रद्द' : 'Payment Cancelled',
            hi
              ? 'आपने भुगतान प्रक्रिया रद्द कर दी है। आपके बैंक से कोई राशि नहीं काटी गई है।'
              : 'You cancelled the payment. No money was deducted.'
          );
        } else {
          showAlert(
            hi ? 'त्रुटि' : 'Error',
            error?.description || (hi ? 'भुगतान शुरू करने में समस्या आई।' : 'Payment failed.')
          );
        }
      });
    } catch (err: any) {
      console.error('Recharge Error:', err);
      setIsRecharging(false);
      showAlert(
        hi ? 'त्रुटि' : 'Error',
        err.message || (hi ? 'रिचार्ज शुरू करने में विफल।' : 'Failed to initiate recharge.')
      );
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (txFilter === 'all') return true;
    const typeStr = (tx.type || '').toLowerCase();
    const noteStr = (tx.note || tx.description || '').toLowerCase();
    if (txFilter === 'credit') return typeStr.includes('credit');
    if (txFilter === 'debit') return typeStr.includes('debit') || noteStr.includes('purchase');
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <MilkPartnerHeader />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>
            {hi ? 'वॉलेट लोड हो रहा है...' : 'Loading wallet details...'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        >
          {/* PRIMARY WALLET CARD */}
          <LinearGradient
            colors={['#064e3b', '#047857', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletCardHeader}>
              <View style={styles.walletChip}>
                <Ionicons name="shield-checkmark" size={14} color="#A7F3D0" />
                <Text style={styles.walletChipText}>
                  {hi ? 'सत्यापित पार्टनर वॉलेट' : 'Verified Partner Wallet'}
                </Text>
              </View>
              <Ionicons name="wallet-outline" size={26} color="#FFFFFF" style={{ opacity: 0.9 }} />
            </View>

            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>
                {hi ? 'उपलब्ध वॉलेट बैलेंस' : 'Available Wallet Balance'}
              </Text>
              <View style={styles.balanceAmountRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <Text style={styles.balanceAmount}>
                  {walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* MIN BALANCE WARNING OR OK STRIP */}
            <View style={[
              styles.infoStrip,
              walletBalance < minPartnerWalletBalance && { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderColor: 'rgba(254, 202, 202, 0.4)' }
            ]}>
              <Ionicons
                name={walletBalance < minPartnerWalletBalance ? "alert-circle" : "checkmark-circle"}
                size={14}
                color={walletBalance < minPartnerWalletBalance ? "#FECACA" : "#D1FAE5"}
              />
              <Text style={[
                styles.infoStripText,
                walletBalance < minPartnerWalletBalance && { color: '#FEE2E2' }
              ]}>
                {walletBalance < minPartnerWalletBalance
                  ? (hi
                      ? `दूध खरीद हेतु न्यूनतम ₹${minPartnerWalletBalance} आवश्यक है। कृपया रिचार्ज करें!`
                      : `Minimum ₹${minPartnerWalletBalance} required for purchase. Please recharge!`)
                  : (hi
                      ? `न्यूनतम बैलेंस सीमा: ₹${minPartnerWalletBalance} (सक्रिय ✓)`
                      : `Minimum Balance Limit: ₹${minPartnerWalletBalance} (Active ✓)`)}
              </Text>
            </View>

            {/* ACTION BUTTONS (RECHARGE + KFC INFO) */}
            <View style={styles.walletActionsRow}>
              <TouchableOpacity
                style={styles.rechargeBtn}
                onPress={() => setRechargeModalVisible(true)}
                activeOpacity={0.88}
              >
                <Ionicons name="add-circle" size={20} color="#064E3B" />
                <Text style={styles.rechargeBtnText}>
                  {hi ? 'वॉलेट रिचार्ज करें (Add Money)' : 'Recharge Wallet'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.kfcInfoBtn}
                onPress={() => showAlert(
                  hi ? 'KFC नकद सुविधा' : 'KFC Cash Facility',
                  hi
                    ? 'आप अपने नजदीकी KFC सेंटर या फील्ड एग्जीक्यूटिव से भी नकद देकर वॉलेट रिचार्ज करवा सकते हैं। पार्टनर की सभी निकासी (Withdrawals) भी KFC सेंटर द्वारा की जाती है।'
                    : 'You can recharge via cash at any KFC center. All partner withdrawals and payouts are processed through KFC centers.'
                )}
                activeOpacity={0.88}
              >
                <Ionicons name="business" size={16} color="#FFFFFF" />
                <Text style={styles.kfcInfoBtnText}>
                  {hi ? 'KFC सुविधा' : 'KFC Info'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ADMIN CUT INFO CARD */}
          <View style={styles.ruleBannerCard}>
            <View style={styles.ruleBannerRow}>
              <View style={styles.ruleIconCircle}>
                <Ionicons name="pie-chart" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleBannerTitle}>
                  {hi
                    ? `प्लेटफ़ॉर्म शुल्क: ${adminCommissionPercent}% (प्रत्येक बिक्री पर)`
                    : `Platform Fee: ${adminCommissionPercent}% per Sale`}
                </Text>
                <Text style={styles.ruleBannerSub}>
                  {hi
                    ? `प्रत्येक दूध बिक्री पर ${adminCommissionPercent}% KrishiNex प्लेटफ़ॉर्म शुल्क काटा जाएगा। शेष पूरा amount तुरंत आपके वॉलेट में क्रेडिट होगा।`
                    : `${adminCommissionPercent}% KrishiNex platform fee is deducted on each milk sale. The remaining full amount is instantly credited to your wallet.`}
                </Text>
              </View>
            </View>
          </View>

          {/* LIFETIME METRICS */}
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>
              {hi ? 'कार्य निष्पादन विवरण (Lifetime Stats)' : 'Lifetime Performance'}
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="water" size={18} color="#059669" />
                </View>
                <Text style={styles.statBoxVal}>{stats.totalCollectedLiters || 0} L</Text>
                <Text style={styles.statBoxLbl}>{hi ? 'कुल संकलित दूध' : 'Milk Collected'}</Text>
              </View>

              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="bicycle" size={18} color="#2563EB" />
                </View>
                <Text style={styles.statBoxVal}>{stats.totalDeliveredLiters || 0} L</Text>
                <Text style={styles.statBoxLbl}>{hi ? 'कुल वितरित दूध' : 'Milk Delivered'}</Text>
              </View>

              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FDF4FF' }]}>
                  <Ionicons name="receipt" size={18} color="#9333EA" />
                </View>
                <Text style={styles.statBoxVal}>{transactions.length}</Text>
                <Text style={styles.statBoxLbl}>{hi ? 'कुल लेन-देन' : 'Transactions'}</Text>
              </View>
            </View>
          </View>

          {/* TRANSACTIONS SECTION */}
          <View style={styles.txSectionHeader}>
            <Text style={styles.txSectionTitle}>
              {hi ? 'वॉलेट लेन-देन विवरण (Transactions)' : 'Wallet Ledger'}
            </Text>
          </View>

          {/* FILTER PILLS */}
          <View style={styles.filterPillsRow}>
            {(['all', 'debit', 'credit'] as const).map(f => {
              const active = txFilter === f;
              const label =
                f === 'all'
                  ? hi ? 'सभी' : 'All'
                  : f === 'debit'
                  ? hi ? 'खरीद कटौती (Debit)' : 'Purchase'
                  : hi ? 'जमा (Recharge/Sale)' : 'Credits';

              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setTxFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TRANSACTIONS LIST */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई लेन-देन नहीं मिला' : 'No Transactions Found'}
              </Text>
              <Text style={styles.emptySub}>
                {hi
                  ? 'दूध खरीद की कटौती, डिलीवरी कमीशन और वॉलेट रिचार्ज का सम्पूर्ण विवरण यहाँ दर्ज होगा।'
                  : 'All wallet debits, delivery commissions and recharge records will appear here.'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx, idx) => {
              const isCredit = (tx.type || '').toLowerCase().includes('credit');
              const isCompleted = (tx.status || '').toLowerCase() === 'completed';
              const isPending = (tx.status || '').toLowerCase() === 'pending';

              const sign = isCredit ? '+' : '-';
              const amtColor = isCredit ? '#059669' : '#DC2626';

              let dateStr = 'N/A';
              if (tx.createdAt) {
                try {
                  const d = new Date(tx.createdAt);
                  dateStr = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                } catch (e) {
                  dateStr = String(tx.createdAt);
                }
              }

              return (
                <View key={tx._id || idx} style={styles.txCard}>
                  <View style={[
                    styles.txIconBox,
                    { backgroundColor: isCredit ? '#ECFDF5' : '#FEE2E2' }
                  ]}>
                    <Ionicons
                      name={isCredit ? 'arrow-down' : 'arrow-up'}
                      size={18}
                      color={isCredit ? '#059669' : '#DC2626'}
                    />
                  </View>

                  <View style={styles.txInfoCol}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.note || tx.description || (isCredit ? 'Wallet Credit' : 'Payment')}
                    </Text>
                    <Text style={styles.txDate}>{dateStr}</Text>
                    {tx.transactionId && (
                      <Text style={styles.txRefId}>ID: {tx.transactionId}</Text>
                    )}
                  </View>

                  <View style={styles.txRightCol}>
                    <Text style={[styles.txAmount, { color: amtColor }]}>
                      {sign}₹{Number(tx.amount || 0).toFixed(2)}
                    </Text>
                    <View style={[
                      styles.txStatusBadge,
                      {
                        backgroundColor: isCompleted ? '#ECFDF5' : isPending ? '#FEF3C7' : '#FEE2E2',
                      }
                    ]}>
                      <Text style={[
                        styles.txStatusText,
                        {
                          color: isCompleted ? '#059669' : isPending ? '#D97706' : '#DC2626',
                        }
                      ]}>
                        {tx.status || 'Success'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* RECHARGE WALLET MODAL */}
      <Modal
        visible={rechargeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isRecharging && setRechargeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {hi ? 'वॉलेट रिचार्ज करें (Add Money)' : 'Recharge Wallet'}
                </Text>
                <Text style={styles.modalSub}>
                  {hi ? `वर्तमान बैलेंस: ₹${walletBalance}` : `Current Balance: ₹${walletBalance}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !isRecharging && setRechargeModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* AMOUNT INPUT */}
            <Text style={styles.inputLabel}>
              {hi ? 'रिचार्ज राशि दर्ज करें (₹)' : 'Enter Amount (₹)'}
            </Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.amountInputSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="1000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={rechargeAmount}
                onChangeText={setRechargeAmount}
                editable={!isRecharging}
              />
            </View>

            {/* QUICK PRESET CHIPS */}
            <View style={styles.quickChipsRow}>
              {[500, 1000, 2000, 5000].map(val => (
                <TouchableOpacity
                  key={val}
                  style={styles.quickChip}
                  onPress={() => setRechargeAmount(String(val))}
                >
                  <Text style={styles.quickChipText}>₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* KFC CASH NOTICE BOX */}
            <View style={styles.kfcNoticeBox}>
              <Ionicons name="information-circle" size={16} color="#0284C7" />
              <Text style={styles.kfcNoticeText}>
                {hi
                  ? `दूध खरीद हेतु आपके वॉलेट में कम से कम ₹${minPartnerWalletBalance} बैलेंस होना अनिवार्य है। आप ऑनलाइन UPI/कार्ड से अथवा नज़दीकी KFC सेंटर पर नकद जमा कराकर भी तुरंत रिचार्ज कर सकते हैं।`
                  : `Minimum ₹${minPartnerWalletBalance} wallet balance is required for milk purchase. Pay online or deposit cash at nearest KFC center.`}
              </Text>
            </View>

            {/* RECHARGE SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitRechargeBtn, isRecharging && { opacity: 0.7 }]}
              onPress={handleRecharge}
              disabled={isRecharging}
              activeOpacity={0.88}
            >
              {isRecharging ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#FFFFFF" />
                  <Text style={styles.submitRechargeBtnText}>
                    {hi ? 'ऑनलाइन रिचार्ज करें (Pay via Razorpay)' : 'Pay via Razorpay'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: '600' },

  walletCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletChipText: { color: '#E6FFFA', fontSize: 11, fontWeight: '700' },
  balanceSection: { marginTop: 18 },
  balanceLabel: { color: '#D1FAE5', fontSize: 12, fontWeight: '600' },
  balanceAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  rupeeSymbol: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginRight: 4 },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -0.5 },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 14,
  },
  infoStripText: { color: '#D1FAE5', fontSize: 11, fontWeight: '700', flex: 1 },

  walletActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  rechargeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  rechargeBtnText: { color: '#064E3B', fontSize: 13, fontWeight: '900' },
  kfcInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  kfcInfoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Rule Banner
  ruleBannerCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  ruleBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleBannerTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  ruleBannerSub: { fontSize: 11, color: '#047857', fontWeight: '500', marginTop: 2, lineHeight: 15 },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsCardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statBoxVal: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  statBoxLbl: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2, textAlign: 'center' },

  txSectionHeader: { marginTop: 20, marginBottom: 8 },
  txSectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  filterPillsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: { backgroundColor: '#059669', borderColor: '#059669' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  filterPillTextActive: { color: '#FFFFFF' },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 10 },
  emptySub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 16 },

  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfoCol: { flex: 1, marginRight: 8 },
  txTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  txDate: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '500' },
  txRefId: { fontSize: 9, color: '#94A3B8', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  txRightCol: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '900' },
  txStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  txStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  amountInputSymbol: { fontSize: 20, fontWeight: '800', color: '#059669', marginRight: 6 },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickChipText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  kfcNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  kfcNoticeText: { flex: 1, fontSize: 11, color: '#0369A1', fontWeight: '500', lineHeight: 16 },
  submitRechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitRechargeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
