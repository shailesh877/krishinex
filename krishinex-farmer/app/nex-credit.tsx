// app/nex-credit.tsx — KHETIFY AGRI-CREDIT (Nex Credit)
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
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';
const NEX_BLUE = '#1E40AF'; // Premium Blue for Credit
const NEX_BLUE_LIGHT = '#3B82F6';

type LedgerTxn = {
    _id: string;
    amount: number;
    type: 'PAYMENT' | 'DUE';
    method: 'CASH' | 'WALLET' | 'DUE' | 'RECOVERY' | 'SHOP_DUE';
    note: string;
    createdAt: string;
    shopId?: {
        name: string;
        businessName: string;
        phone: string;
    };
};

export default function NexCreditScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [creditLimit, setCreditLimit] = useState(0);
  const [creditUsed, setCreditUsed] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [transactions, setTransactions] = useState<LedgerTxn[]>([]);
  const [activeTab, setActiveTab] = useState<'NEX' | 'SHOP'>('NEX');
  const [selectedTxn, setSelectedTxn] = useState<LedgerTxn | null>(null);

  const t = {
    title: hi ? 'नेक्स क्रेडिट / शॉप क्रेडिट' : 'Nex Credit / Shop Credit',
    availableCredit: hi ? 'उपलब्ध क्रेडिट' : 'Available Credit',
    totalLimit: hi ? 'कुल सीमा' : 'Total Limit',
    totalUsed: hi ? 'उपयोग किया गया' : 'Used Credit',
    infoLine: hi
      ? 'यह क्रेडिट केवल कृषि सामग्री खरीदने के लिए मान्य है।'
      : 'This credit is valid only for purchasing agricultural inputs.',
    usageNote: hi
      ? 'समय पर भुगतान करने से आपकी क्रेडिट सीमा बढ़ सकती है।'
      : 'Timely repayments can help increase your credit limit.',
    listHeading: hi ? 'लेन-देन का इतिहास' : 'Transaction History',
    nexTab: hi ? 'Nex Credit' : 'Nex Credit',
    shopTab: hi ? 'शॉप क्रेडिट' : 'Shop Credit',
    dueLabel: hi ? 'बकाया (Due)' : 'Due',
    dueClearLabel: hi ? 'चुकाया गया (Due Clear)' : 'Due Clear',
  };

  const fetchCreditData = async () => {
    try {
      const { data } = await authApi.getCreditData();
      setCreditLimit(data.creditLimit);
      setCreditUsed(data.creditUsed);
      setCardNumber(data.cardNumber || '');
      setUserName(data.name || '');
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Fetch credit error:', error);
      showAlert(hi ? 'त्रुटi' : 'Error', hi ? 'क्रेडिट डेटा लोड करने में विफल' : 'Failed to load credit data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCreditData();
    }, [hi])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCreditData();
  };

  const formatCardNumber = (digits: string) => {
    if (!digits) return '0000 0000 0000 0000';
    const clean = digits.replace(/\D/g, '');
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'DUE': return hi ? 'उधार खरीदारी' : 'Credit Purchase';
      case 'RECOVERY': return hi ? 'भुगतान (पुनर्भुगतान)' : 'Repayment (Recovery)';
      case 'SHOP_DUE': return hi ? 'दुकान उधार' : 'Shop Due';
      case 'CASH': return hi ? 'नकद भुगतान' : 'Cash Payment';
      case 'WALLET': return hi ? 'वॉलेट भुगतान' : 'Wallet Payment';
      default: return method;
    }
  };

  const getTxnIcon = (method: string) => {
    if (method === 'RECOVERY') return { name: 'arrow-down-circle', color: '#16A34A', bg: '#DCFCE7' };
    if (method === 'DUE') return { name: 'cart-outline', color: '#DC2626', bg: '#FEE2E2' };
    return { name: 'receipt-outline', color: '#3B82F6', bg: '#DBEAFE' };
  };

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
        {/* TAB SWITCHER */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'NEX' && styles.activeTab]} 
            onPress={() => setActiveTab('NEX')}
          >
            <Text style={[styles.tabText, activeTab === 'NEX' && styles.activeTabText]}>{t.nexTab}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'SHOP' && styles.activeTab]} 
            onPress={() => setActiveTab('SHOP')}
          >
            <Text style={[styles.tabText, activeTab === 'SHOP' && styles.activeTabText]}>{t.shopTab}</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARD (Only for Nex Credit) */}
        {activeTab === 'NEX' && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>{t.availableCredit}</Text>
                <Text style={styles.summaryAmount}>
                  ₹ {(creditLimit - creditUsed).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.limitIconWrap}>
                <Ionicons name="infinite-outline" size={32} color={NEX_BLUE} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t.totalLimit}</Text>
                <Text style={styles.statValue}>₹ {creditLimit.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t.totalUsed}</Text>
                <Text style={[styles.statValue, { color: '#DC2626' }]}>₹ {creditUsed.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#4B5563" />
              <Text style={styles.infoText}>{t.infoLine}</Text>
            </View>
          </View>
        )}

        {/* TRANSACTIONS LIST */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>{t.listHeading}</Text>
          
          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator style={{ padding: 30 }} color={NEX_BLUE} />
            ) : (
                transactions
                    .filter(item => {
                        const isNexRecovery = item.method === 'RECOVERY' && item.note?.toLowerCase().includes('nex credit');
                        
                        if (activeTab === 'NEX') {
                            return item.method === 'DUE' || isNexRecovery;
                        } else {
                            return item.method === 'SHOP_DUE' || (item.method === 'RECOVERY' && !isNexRecovery);
                        }
                    })
                    .length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="reader-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>{hi ? 'अभी तक कोई लेन-देन नहीं हुआ' : 'No transactions yet'}</Text>
                </View>
                ) : (
                transactions
                    .filter(item => {
                        const isNexRecovery = item.method === 'RECOVERY' && item.note?.toLowerCase().includes('nex credit');
                        
                        if (activeTab === 'NEX') {
                            return item.method === 'DUE' || isNexRecovery;
                        } else {
                            return item.method === 'SHOP_DUE' || (item.method === 'RECOVERY' && !isNexRecovery);
                        }
                    })
                    .map((item) => {
                    const icon = getTxnIcon(item.method);
                    const isRecovery = item.method === 'RECOVERY';
                    const isShopTab = activeTab === 'SHOP';
                    
                    // Display labels for Shop Credit specifically
                    let displayTitle = getMethodLabel(item.method);
                    if (isShopTab) {
                        if (item.method === 'SHOP_DUE') displayTitle = t.dueLabel;
                        if (item.method === 'RECOVERY') displayTitle = t.dueClearLabel;
                    }

                    return (
                    <TouchableOpacity 
                        key={item._id} 
                        style={styles.txnItem}
                        onPress={() => setSelectedTxn(item)}
                    >
                        <View style={[styles.txnIconWrap, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name as any} size={18} color={icon.color} />
                        </View>
                        
                        <View style={styles.txnBody}>
                        <Text style={styles.txnTitle} numberOfLines={1}>
                            {displayTitle}
                        </Text>
                        <Text style={styles.txnSub} numberOfLines={1}>
                            {item.shopId?.businessName || item.shopId?.name || (hi ? 'कृषि केंद्र' : 'Agri Center')}
                        </Text>
                        <Text style={styles.txnDate}>
                            {new Date(item.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            })}
                        </Text>
                        </View>

                        <View style={styles.txnRight}>
                        <Text style={[styles.txnAmount, { color: isRecovery ? '#16A34A' : '#DC2626' }]}>
                            {isRecovery ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                        </View>
                    </TouchableOpacity>
                    );
                })
            ))}
          </View>
        </View>
      </ScrollView>

      {/* DETAIL MODAL */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            
            {selectedTxn && (
              <>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{hi ? 'लेन-देन विवरण' : 'Transaction Detail'}</Text>
                    <Text style={[styles.modalAmount, { color: selectedTxn.method === 'RECOVERY' ? '#16A34A' : '#DC2626' }]}>
                        {selectedTxn.method === 'RECOVERY' ? '+' : '-'} ₹{selectedTxn.amount.toLocaleString('en-IN')}
                    </Text>
                </View>

                <View style={styles.modalBody}>
                    <DetailRow label={hi ? 'प्रकार' : 'Type'} value={getMethodLabel(selectedTxn.method)} />
                    <DetailRow label={hi ? 'स्थान' : 'Location'} value={selectedTxn.shopId?.businessName || selectedTxn.shopId?.name || '—'} />
                    <DetailRow label={hi ? 'तारीख' : 'Date'} value={new Date(selectedTxn.createdAt).toLocaleString()} />
                    <DetailRow label={hi ? 'नोट' : 'Note'} value={selectedTxn.note || (hi ? 'कोई टिप्पणी नहीं' : 'No remarks')} />
                    {selectedTxn.shopId?.phone && (
                        <DetailRow label={hi ? 'संपर्क' : 'Contact'} value={selectedTxn.shopId.phone} />
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.closeBtn}
                    onPress={() => setSelectedTxn(null)}
                >
                    <Text style={styles.closeBtnText}>{hi ? 'बंद करें' : 'Close'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
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
  content: { padding: 16 },
  
  // TABS
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  activeTabText: {
    color: NEX_BLUE,
  },

  // SUMMARY
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
    borderTopWidth: 4,
    borderTopColor: NEX_BLUE,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  summaryAmount: { fontSize: 36, fontWeight: '900', color: '#1E3A8A', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },
  statsRow: { flexDirection: 'row' },
  statCol: { flex: 1 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  infoBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8 },
  infoText: { fontSize: 11, color: '#4B5563', marginLeft: 6, fontWeight: '500' },

  // LIST
  listSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  listContainer: { backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 12, elevation: 2 },
  txnItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txnIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txnBody: { flex: 1, marginLeft: 12 },
  txnTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  txnSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  txnDate: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  txnRight: { flexDirection: 'row', alignItems: 'center' },
  txnAmount: { fontSize: 14, fontWeight: '800', marginRight: 8 },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 16, color: '#6B7280', fontWeight: '700' },
  modalAmount: { fontSize: 32, fontWeight: '900', marginTop: 8 },
  modalBody: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  closeBtn: { backgroundColor: NEX_BLUE, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
