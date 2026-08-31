// app/wallet.tsx — KHETIFY WALLET (Filter: All / Received / Withdrawn)

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ImageBackground,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

type SellTxn = {
  id: string;
  crop: string;
  buyer: string;
  mandi: string;
  qty: string;
  rate: string;
  amount: number;
  date: string;
};

type WithdrawTxn = {
  id: string;
  amount: number;
  cscName: string;
  refId: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
  module?: string;
};

type UnifiedTxn =
  | ({ kind: 'received', module?: string } & SellTxn)
  | ({ kind: 'withdrawn' } & WithdrawTxn);

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'received' | 'withdrawn'>('all');

  const [currentBalance, setCurrentBalance] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [unifiedList, setUnifiedList] = useState<UnifiedTxn[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  const t = {
    title: hi ? 'वॉलेट' : 'Wallet',
    currentBalance: hi ? 'उपलब्ध राशि' : 'Available Amount',
    totalReceived: hi ? 'कुल प्राप्त' : 'Total Received',
    totalWithdrawn: hi ? 'कुल निकासी' : 'Total Withdrawn',
    infoLine: hi
      ? 'खरीदार पूरा पैसा एडमिन को देता है, और किसान KSP से निकासी करता है।'
      : 'Buyer pays full amount to admin, farmer withdraws via KSP.',
    withdrawNote: hi
      ? 'निकासी सिर्फ आपके नज़दीकी KSP केंद्र पर उपलब्ध है।'
      : 'Withdrawals are handled at your nearest KSP center.',
    mandiLabel: hi ? 'मंडी' : 'Mandi',
    qtyLabel: hi ? 'मात्रा' : 'Quantity',
    rateLabel: hi ? 'रेट' : 'Rate',
    cscLabel: hi ? 'KSP केंद्र' : 'KSP Center',
    refLabel: hi ? 'रिफरेंस आईडी' : 'Reference ID',
    filterAll: hi ? 'सभी' : 'All',
    filterReceived: hi ? 'प्राप्त' : 'Received',
    filterWithdrawn: hi ? 'निकासी' : 'Withdrawn',
    listHeading: hi ? 'लेन-देन का विवरण' : 'Wallet transactions',
    receivedLabel: hi ? 'प्राप्त' : 'Received',
    withdrawnLabel: hi ? 'निकासी' : 'Withdrawn',
    cardTitle: hi ? 'KrishiNex वॉलेट' : 'KrishiNex WALLET',
    cardHolderLabel: hi ? 'कार्ड होल्डर' : 'Card Holder',
    cardNumberLabel: hi ? 'नेक्स कार्ड नंबर' : 'Nex Card Number',
    addCardNumber: hi ? 'कार्ड नंबर जोड़ें' : 'Add card number',
  };

  const cardHolderDisplay = userName || (hi ? 'किसान' : 'Farmer');

  const fetchWalletData = async () => {
    try {
      const { data } = await authApi.getWalletData();
      setCurrentBalance(data.balance);
      setCardNumber(data.cardNumber || '');
      setUserName(data.name || '');

      const mapped: UnifiedTxn[] = (data.transactions || []).map((t: any) => {
        const isWithdrawn = t.type === 'Payout' || t.type === 'Debit' || t.type === 'Payment';

        if (!isWithdrawn) {
          let displayCrop = t.module === 'Platform' ? (hi ? 'वॉलेट रिचार्ज' : 'Wallet Recharge') : (t.module === 'Shop' ? (hi ? 'शॉप रिफंड' : 'Shop Refund') : (t.module || 'Trading'));
          if (t.module === 'Labour') displayCrop = hi ? 'लेबर बुकिंग रिफंड' : 'Labour Refund';
          
          return {
            kind: 'received',
            id: t._id,
            crop: displayCrop,
            buyer: 'KrishiNex',
            mandi: t.note || (hi ? 'डायरेक्ट' : 'Direct'),
            qty: '',
            rate: '',
            amount: t.amount,
            module: t.module,
            rawTxn: t,
            date: new Date(t.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
          };
        } else {
          let cscDisplay = t.paymentMode === 'Bank Transfer' ? 'Bank Transfer' : 'KSP Center';
          if (t.module === 'Shop') {
            cscDisplay = hi ? 'दुकान भुगतान' : 'Shop Payment';
          } else if (t.module === 'Machine Rental' || t.module === 'Equipment') {
            cscDisplay = hi ? 'मशीन बुकिंग भुगतान' : 'Machine Rental Payment';
          } else if (t.module === 'Labour Booking') {
            cscDisplay = hi ? 'लेबर बुकिंग भुगतान' : 'Labour Booking Payment';
          } else if (t.module === 'Labour') {
            cscDisplay = hi ? 'लेबर भुगतान' : 'Labour Payment';
          } else if (t.module === 'Soil') {
            cscDisplay = hi ? 'मिट्टी जांच भुगतान' : 'Soil Test Payment';
          } else if (t.module === 'KSP') {
            cscDisplay = hi ? 'KSP केंद्र निकासी' : 'KSP Center Withdrawal';
          }

          return {
            kind: 'withdrawn',
            id: t._id,
            amount: t.amount,
            cscName: cscDisplay,
            refId: t.transactionId,
            module: t.module,
            rawTxn: t,
            date: new Date(t.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            status: (t.status || '').toLowerCase() === 'completed' ? 'success' : (t.status || 'success').toLowerCase() as any,
          };
        }
      });

      setUnifiedList(mapped);
    } catch (error) {
      console.error('Fetch wallet error:', error);
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'वॉलेट डेटा लोड करने में विफल' : 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  // Removed manual update as per requirements

  const totalReceived = useMemo(() =>
    unifiedList.filter(i => i.kind === 'received').reduce((sum, current) => sum + current.amount, 0),
    [unifiedList]
  );

  const totalWithdrawn = useMemo(() =>
    unifiedList.filter(i => i.kind === 'withdrawn').reduce((sum, current) => sum + current.amount, 0),
    [unifiedList]
  );

  const statusColor = (status: WithdrawTxn['status']) => {
    if (status === 'success') return '#16A34A';
    if (status === 'pending') return '#F59E0B';
    return '#DC2626';
  };

  const statusText = (status: WithdrawTxn['status']) => {
    if (status === 'success') return hi ? 'सफल' : 'Success';
    if (status === 'pending') return hi ? 'लंबित' : 'Pending';
    return hi ? 'असफल' : 'Failed';
  };

  const formatCardNumber = (digits: string) => {
    if (!digits) return '';
    const clean = digits.replace(/\D/g, '');
    // Format 16 digits as 4-4-4-4
    if (clean.length === 16) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12)}`;
    }
    // Format 11 digits as 4-4-3
    if (clean.length === 11) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`;
    }
    // Fallback for other lengths
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const cardNumberFormatted = formatCardNumber(cardNumber);

  const filteredList = useMemo(
    () =>
      filter === 'all'
        ? unifiedList
        : unifiedList.filter(item => item.kind === filter),
    [filter, unifiedList],
  );

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* WALLET CARD (Image Background) */}
        <View style={styles.cardWrapper}>
          <ImageBackground
            source={require('../assets/images/KrishinexNexCard.jpeg')}
            style={styles.walletCardImage}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.cardOverlay}>
              {!cardNumber ? (
                <Text style={styles.addCardTextOverlay}>
                  {hi ? 'वेरिफिकेशन के बाद जेनरेट होगा' : 'Will be generated after verification'}
                </Text>
              ) : (
                <Text style={styles.cardNumberTextOverlay}>
                  {cardNumberFormatted}
                </Text>
              )}
            </View>
          </ImageBackground>
        </View>


        {/* SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <Text style={styles.label}>{t.currentBalance}</Text>
          <Text style={styles.bigAmount}>
            ₹ {currentBalance.toLocaleString('en-IN')}
          </Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.smallLabel}>{t.totalReceived}</Text>
              <Text style={[styles.smallAmount, { color: '#16A34A' }]}>
                ₹ {totalReceived.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.smallLabel}>{t.totalWithdrawn}</Text>
              <Text style={[styles.smallAmount, { color: '#DC2626' }]}>
                ₹ {totalWithdrawn.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.infoStrip}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.infoText}>{t.infoLine}</Text>
          </View>

          <View style={styles.infoStripSoft}>
            <Ionicons
              name="business-outline"
              size={16}
              color="#065F46"
            />
            <Text style={styles.infoTextSoft}>{t.withdrawNote}</Text>
          </View>
        </View>

        {/* FILTER PILLS */}
        <View style={styles.filterRow}>
          <FilterChip
            label={t.filterAll}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterChip
            label={t.filterReceived}
            active={filter === 'received'}
            onPress={() => setFilter('received')}
          />
          <FilterChip
            label={t.filterWithdrawn}
            active={filter === 'withdrawn'}
            onPress={() => setFilter('withdrawn')}
          />
        </View>

        {/* MERGED LIST */}
        <Text style={styles.sectionTitle}>{t.listHeading}</Text>

        <View style={styles.listCard}>
          {loading ? (
            <ActivityIndicator style={{ margin: 20 }} color={KHETIFY_GREEN_DARK} />
          ) : filteredList.length === 0 ? (
            <Text style={{ textAlign: 'center', margin: 20, color: '#999' }}>
              {hi ? 'कोई लेन-देन नहीं' : 'No transactions found'}
            </Text>
          ) : (
            filteredList.map(item => {
              const txn = (item as any).rawTxn;
              if (item.kind === 'received') {
                return (
                  <TouchableOpacity key={`r-${item.id}`} style={styles.rowItem} activeOpacity={0.8} onPress={() => setSelectedTxn({ ...item, rawTxn: txn })}>
                    <View style={styles.iconWrapReceived}>
                      <Ionicons name="storefront-outline" size={18} color={KHETIFY_GREEN_DARK} />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={styles.mainTitle} numberOfLines={1}>
                        {t.receivedLabel}: {item.crop}
                      </Text>
                      <Text style={styles.sub} numberOfLines={1}>
                        {item.module === 'Platform' ? '' : `${t.mandiLabel}: `}{item.mandi}
                      </Text>
                      <Text style={styles.date}>{item.date}</Text>
                    </View>

                    <View style={styles.amountRight}>
                      <Text style={[styles.amountText, { color: '#16A34A' }]}>
                        + ₹ {item.amount.toLocaleString('en-IN')}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity key={`w-${item.id}`} style={styles.rowItem} activeOpacity={0.8} onPress={() => setSelectedTxn({ ...item, rawTxn: txn })}>
                  <View style={styles.iconWrapWithdraw}>
                    <Ionicons name="download-outline" size={18} color="#B45309" />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={styles.mainTitle} numberOfLines={1}>
                      {item.module && ['Shop', 'Labour', 'Labour Booking', 'Machine Rental', 'Equipment', 'Soil', 'AgriDoctor', 'KSP'].includes(item.module) 
                        ? item.cscName 
                        : t.withdrawnLabel}
                    </Text>
                    {(!item.module || !['Shop', 'Labour', 'Labour Booking', 'Machine Rental', 'Equipment', 'Soil', 'AgriDoctor', 'KSP'].includes(item.module)) ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        {t.cscLabel}: {item.cscName}
                      </Text>
                    ) : null}
                    {item.refId ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        {t.refLabel}: {item.refId}
                      </Text>
                    ) : null}
                    <Text style={styles.date}>{item.date}</Text>
                  </View>

                  <View style={styles.amountRight}>
                    <Text style={[styles.amountText, { color: '#DC2626' }]}>
                      - ₹ {item.amount.toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: `${statusColor(item.status)}15` },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor(item.status) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusColor(item.status) },
                        ]}
                      >
                        {statusText(item.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* TRANSACTION DETAIL MODAL */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {selectedTxn && (() => {
              const txn = selectedTxn.rawTxn || {};
              const isDebit = selectedTxn.kind === 'withdrawn';
              return (
                <>
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconWrap, { backgroundColor: isDebit ? '#FEF3C7' : '#ECFDF5' }]}>
                      <Ionicons
                        name={isDebit ? 'download-outline' : 'storefront-outline'}
                        size={28}
                        color={isDebit ? '#B45309' : KHETIFY_GREEN_DARK}
                      />
                    </View>
                    <Text style={styles.detailTitle}>
                      {isDebit ? (hi ? 'भुगतान विवरण' : 'Payment Details') : (hi ? 'प्राप्ति विवरण' : 'Receipt Details')}
                    </Text>
                    <Text style={[styles.detailAmount, { color: isDebit ? '#DC2626' : '#16A34A' }]}>
                      {isDebit ? '- ' : '+ '}₹{selectedTxn.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.detailBody}>
                    {[
                      { label: hi ? 'लेनदेन आईडी' : 'Transaction ID', value: txn.transactionId || '—' },
                      { label: hi ? 'प्रकार' : 'Type', value: txn.type || '—' },
                      { label: hi ? 'मॉड्यूल' : 'Module', value: txn.module || '—' },
                      { label: hi ? 'भुगतान माध्यम' : 'Payment Mode', value: txn.paymentMode || (isDebit ? 'NexCard Wallet' : '—') },
                      { label: hi ? 'स्थिति' : 'Status', value: txn.status || '—' },
                      { label: hi ? 'नोट' : 'Note', value: txn.note || '—' },
                      { label: hi ? 'तारीख' : 'Date', value: selectedTxn.date },
                    ].map((row, idx) => (
                      <View key={idx} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{row.label}</Text>
                        <Text style={styles.detailValue} selectable>{row.value}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setSelectedTxn(null)} activeOpacity={0.8}>
                    <Text style={styles.detailCloseBtnText}>{hi ? 'बंद करें' : 'Close'}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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

  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
  },

  // WALLET CARD (green)
  cardWrapper: {
    marginBottom: 14,
  },
  walletCardImage: {
    width: '100%',
    aspectRatio: 1.586,
    overflow: 'hidden',
    borderRadius: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '25%',
  },
  cardNumberTextOverlay: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  addCardTextOverlay: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  walletCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: KHETIFY_GREEN_DARK,
    overflow: 'hidden',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  walletCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ECFCCB',
    letterSpacing: 1,
  },
  cardNumberLabel: {
    fontSize: 11,
    color: '#DCFCE7',
    marginBottom: 4,
  },
  addCardText: {
    fontSize: 16,
    color: '#BBF7D0',
    fontWeight: '600',
  },
  cardNumberText: {
    fontSize: 18,
    letterSpacing: 3,
    color: '#F9FAFB',
    fontWeight: '800',
    paddingVertical: 2,
  },
  cardBottomRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolderLabel: {
    fontSize: 10,
    color: '#DCFCE7',
  },
  cardHolderText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  cardLogoChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLogoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FACC15',
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
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  bigAmount: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    marginTop: 12,
  },
  col: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  smallAmount: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
  },
  infoStrip: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  infoStripSoft: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextSoft: {
    marginLeft: 6,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },

  filterRow: {
    marginTop: 14,
    marginBottom: 4,
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    padding: 3,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: KHETIFY_GREEN_DARK,
  },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.7,
    borderBottomColor: '#F3F4F6',
  },

  iconWrapReceived: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapWithdraw: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  sub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  amountRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '900',
  },

  statusPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
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

  // TRANSACTION DETAIL MODAL
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  detailAmount: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  detailBody: {
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  detailCloseBtn: {
    backgroundColor: KHETIFY_GREEN_DARK,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
