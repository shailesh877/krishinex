import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

const API_URL = `${BASE_API_URL}/shop`;

interface LedgerStats {
  totalCash: number;
  totalWallet: number;
  totalDue: number;
  totalAgriCredit: number;
  totalRecovery: number;
}

interface DueInfo {
  _id: string;
  netDue: number;
  farmer: {
    _id: string;
    name: string;
    phone: string;
  };
}

interface Transaction {
  _id: string;
  farmerId?: {
    _id: string;
    name: string;
    phone: string;
  };
  orderId?: {
    items: Array<{
      itemRef?: { name: string; price: number };
      name: string;
      quantity: number;
      price: number;
      variantLabel?: string;
    }>;
  };
  amount: number;
  method: 'CASH' | 'WALLET' | 'DUE' | 'SHOP_DUE' | 'RECOVERY' | 'PLATFORM_RECOVERY' | 'PLATFORM_PAYMENT';
  type: 'PAYMENT' | 'DUE';
  note: string;
  createdAt: string;
}

export default function LedgerScreen() {
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [dues, setDues] = useState<DueInfo[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Farmer Details Modal
  const [selectedFarmer, setSelectedFarmer] = useState<DueInfo | null>(null);
  const [farmerDetails, setFarmerDetails] = useState<Transaction[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Transaction Details Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [typeFilter])
  );

  const fetchData = async () => {
    try {
      // if (length === 0) setLoading(true) removed for silent polling
      const token = await AsyncStorage.getItem('userToken');

      let startDate = '';
      let endDate = '';
      if (fromDate) {
        const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
        startDate = from.toISOString();
      }
      if (toDate) {
        const to = new Date(toDate); to.setHours(23, 59, 59, 999);
        endDate = to.toISOString();
      }

      const [statsRes, duesRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/ledger/dashboard?startDate=${startDate}&endDate=${endDate}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ledger/dues`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ledger/history?startDate=${startDate}&endDate=${endDate}&method=${typeFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (duesRes.ok) setDues(await duesRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch (e) {
      console.error('Fetch ledger data error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFarmerDetails = async (farmerId: string) => {
    try {
      setLoadingDetails(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/ledger/dues/${farmerId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setFarmerDetails(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const sendReminder = async (farmerId: string, farmerName: string, amount: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/ledger/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ farmerId, amount }),
      });

      if (response.ok) {
        showAlert(
          isHindi ? 'रिमाइंडर भेजा गया' : 'Reminder Sent',
          isHindi ? `${farmerName} को पेमेंट का रिमाइंडर भेज दिया गया है।` : `A payment reminder has been sent to ${farmerName}.`
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearDue = (farmerId: string, farmerName: string, amount: number) => {
    showAlert(
      isHindi ? 'पेमेंट दर्ज करें' : 'Record Payment',
      isHindi ? `क्या आप ₹${amount} की रिकवरी दर्ज करना चाहते हैं?` : `Do you want to record recovery of ₹${amount}?`,
      [
        { text: isHindi ? 'कैंसल' : 'No', style: 'cancel' },
        {
          text: isHindi ? 'हाँ' : 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${BASE_API_URL}/shop/pos/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  orderId: 'MANUAL_RECOVERY',
                  otp: 'RECOVERY',
                  recoveryAmount: amount,
                  farmerId: farmerId
                })
              });
              if (response.ok) {
                showAlert('Success', 'Payment recorded');
                fetchData();
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const renderBadge = (method: string) => {
    let color = '#6B7280';
    if (method === 'CASH') color = '#16A34A';
    if (method === 'WALLET') color = '#2563EB';
    if (method === 'SHOP_DUE') color = '#DC2626';
    if (method === 'DUE') color = '#D97706';
    return (
      <View style={[styles.methodBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.methodBadgeText, { color }]}>{method}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 16) : 24 }]}>
        <Text style={styles.title}>{isHindi ? 'बही-खाता (Ledger)' : 'Digital Ledger'}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#16A34A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* DATE RANGE FILTER BAR */}
        <View style={styles.dateRangeBar}>
          {/* FROM */}
          <TouchableOpacity style={styles.dateRangeBtn} onPress={() => setShowFromPicker(true)}>
            <Ionicons name="calendar-outline" size={14} color="#16A34A" style={{ marginRight: 5 }} />
            <View>
              <Text style={styles.dateRangeLabel}>{isHindi ? 'से' : 'From'}</Text>
              <Text style={styles.dateRangeValue}>
                {fromDate
                  ? fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                  : (isHindi ? 'तारीख चुनें' : 'Pick date')}
              </Text>
            </View>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={16} color="#CBD5E1" style={{ marginHorizontal: 6 }} />

          {/* TO */}
          <TouchableOpacity style={styles.dateRangeBtn} onPress={() => setShowToPicker(true)}>
            <Ionicons name="calendar-outline" size={14} color="#DC2626" style={{ marginRight: 5 }} />
            <View>
              <Text style={styles.dateRangeLabel}>{isHindi ? 'तक' : 'To'}</Text>
              <Text style={styles.dateRangeValue}>
                {toDate
                  ? toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                  : (isHindi ? 'तारीख चुनें' : 'Pick date')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Apply */}
          <TouchableOpacity
            style={[styles.applyBtn, !fromDate && { opacity: 0.35 }]}
            disabled={!fromDate}
            onPress={() => fetchData()}
          >
            <Ionicons name="search" size={16} color="#FFF" />
          </TouchableOpacity>

          {/* Clear */}
          {(fromDate || toDate) && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setFromDate(null); setToDate(null); setTimeout(fetchData, 50); }}
            >
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Native Date Pickers */}
        {showFromPicker && (
          <DateTimePicker
            value={fromDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={toDate || new Date()}
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromDate(date);
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={toDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={fromDate || undefined}
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) setToDate(date);
            }}
          />
        )}

        {/* STATS CARDS */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#16A34A' }]}>
            <Text style={styles.statLabel}>{isHindi ? 'नकद (Cash)' : 'Cash'}</Text>
            <Text style={[styles.statVal, { color: '#16A34A' }]}>₹{stats?.totalCash || 0}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#2563EB' }]}>
            <Text style={styles.statLabel}>{isHindi ? 'वॉलेट (Wallet)' : 'Wallet'}</Text>
            <Text style={[styles.statVal, { color: '#2563EB' }]}>₹{stats?.totalWallet || 0}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#DC2626' }]}>
            <Text style={styles.statLabel}>{isHindi ? 'दुकान उधार' : 'Shop Due'}</Text>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>₹{stats?.totalDue || 0}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#D97706' }]}>
            <Text style={styles.statLabel}>{isHindi ? 'एग्री क्रेडिट' : 'Agri Credit'}</Text>
            <Text style={[styles.statVal, { color: '#D97706' }]}>₹{stats?.totalAgriCredit || 0}</Text>
          </View>
        </View>

        {/* ODHAAR LIST SECTION */}
        {dues.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.row}>
                <Text style={styles.sectionTitle}>{isHindi ? 'बकाया भुगतान (Udhaar List)' : 'Personal Debtors'}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{dues.length}</Text>
                </View>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmerScroll}>
              {dues.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.farmerCard}
                  onPress={() => {
                    setSelectedFarmer(item);
                    fetchFarmerDetails(item._id);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.farmer.name.substring(0, 1)}</Text>
                  </View>
                  <Text style={styles.farmerCardName} numberOfLines={1}>{item.farmer.name}</Text>
                  <Text style={styles.farmerCardAmount}>₹{item.netDue}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* TRANSACTION HISTORY SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isHindi ? 'लेन-देन इतिहास' : 'Sales History'}</Text>
        </View>

        {/* TYPE FILTERS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterScroll}>
          {['ALL', 'CASH', 'WALLET', 'SHOP_DUE', 'DUE', 'RECOVERY'].map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.typeChip, typeFilter === m && styles.typeChipActive]}
              onPress={() => setTypeFilter(m)}
            >
              <Text style={[styles.typeChipText, typeFilter === m && styles.typeChipTextActive]}>{m === 'DUE' ? 'CREDIT' : m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isHindi ? 'किसान का नाम खोजें...' : 'Search by farmer name...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : history.filter(tx => !searchQuery || tx.farmerId?.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>{isHindi ? 'कोई लेनदेन नहीं मिला!' : 'No transactions found!'}</Text>
          </View>
        ) : (
          history
            .filter(tx => !searchQuery || tx.farmerId?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((tx, index) => (
              <TouchableOpacity
                key={tx._id}
                style={styles.historyCard}
                onPress={() => setSelectedTransaction(tx)}
              >
                <View style={styles.historyMain}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyFarmer}>{tx.farmerId?.name || (isHindi ? 'बिना नाम का ग्राहक' : 'Walk-in Customer')}</Text>
                    <Text style={styles.historyDate}>{new Date(tx.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={styles.historyAmountWrapper}>
                    <Text style={[styles.historyAmount, { color: tx.type === 'DUE' ? '#DC2626' : '#16A34A' }]}>
                      {tx.type === 'DUE' ? '-' : '+'}₹{tx.amount}
                    </Text>
                    {renderBadge(tx.method)}
                  </View>
                </View>
                {tx.note && <Text style={styles.historyNote} numberOfLines={1}>{tx.note}</Text>}
              </TouchableOpacity>
            ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* TRANSACTION DETAILS MODAL */}
      <Modal visible={!!selectedTransaction} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{isHindi ? 'लेन-देन विवरण' : 'TX Details'}</Text>
                <Text style={styles.modalSubtitle}>{selectedTransaction?.farmerId?.name || 'Walk-in'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <Ionicons name="close-circle" size={32} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTxInfo}>
              <View style={styles.modalTxRow}>
                <Text style={styles.modalTxLabel}>{isHindi ? 'राशि (Amount)' : 'Total Amount'}</Text>
                <Text style={styles.modalTxVal}>₹{selectedTransaction?.amount}</Text>
              </View>
              <View style={styles.modalTxRow}>
                <Text style={styles.modalTxLabel}>{isHindi ? 'पेमेंट मोड' : 'Payment Mode'}</Text>
                {selectedTransaction && renderBadge(selectedTransaction.method)}
              </View>
              <View style={styles.modalTxRow}>
                <Text style={styles.modalTxLabel}>{isHindi ? 'तारीख (Date)' : 'Date'}</Text>
                <Text style={styles.modalTxSub}>{selectedTransaction && new Date(selectedTransaction.createdAt).toLocaleString()}</Text>
              </View>
            </View>

            {selectedTransaction?.orderId && Array.isArray(selectedTransaction.orderId.items) ? (
              <>
                <Text style={styles.modalSectionTitle}>{isHindi ? 'खरीदे गए सामान' : 'Items Sold'}</Text>
                <ScrollView style={{ maxHeight: '40%' }}>
                  {selectedTransaction.orderId.items.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{it.itemRef?.name || it.name || 'Unknown Product'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={styles.itemQty}>{it.quantity} units x ₹{it.price}</Text>
                          {it.variantLabel && (
                            <View style={styles.variantBadge}>
                              <Text style={styles.variantBadgeText}>{it.variantLabel}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.itemTotal}>₹{it.quantity * it.price}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>{isHindi ? 'विवरण (Description)' : 'Note'}</Text>
                <Text style={styles.noteVal}>{selectedTransaction?.note || '--'}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeBtnFooter}
              onPress={() => setSelectedTransaction(null)}
            >
              <Text style={styles.closeBtnText}>{isHindi ? 'बंद करें' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FARMER DETAILS MODAL */}
      <Modal visible={!!selectedFarmer} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedFarmer?.farmer.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedFarmer?.farmer.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFarmer(null)}>
                <Ionicons name="close-circle" size={32} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalNetDue}>
              <Text style={styles.modalNetDueLabel}>{isHindi ? 'कुल बकाया' : 'Net Outstanding'}</Text>
              <Text style={styles.modalNetDueVal}>₹{selectedFarmer?.netDue}</Text>
            </View>

            <Text style={styles.modalSectionTitle}>{isHindi ? 'लेन-देन विवरण' : 'Transaction Logs'}</Text>

            {loadingDetails ? <ActivityIndicator color="#16A34A" /> : (
              <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
                data={farmerDetails}
                keyExtractor={it => it._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.logItem}
                    onPress={() => {
                      setSelectedFarmer(null);
                      setSelectedTransaction(item);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                      <Text style={styles.logNote} numberOfLines={2}>
                        {item.orderId?.items?.map(it => it.itemRef?.name || it.name).join(', ') || item.note}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.logAmount, { color: item.method === 'SHOP_DUE' ? '#DC2626' : '#16A34A' }]}>
                        {item.method === 'SHOP_DUE' ? '+' : '-'}₹{item.amount}
                      </Text>
                      {renderBadge(item.method)}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9CA3AF' }}>No logs found</Text>}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalRemind} onPress={() => {
                sendReminder(selectedFarmer!._id, selectedFarmer!.farmer.name, selectedFarmer!.netDue);
                setSelectedFarmer(null);
              }}>
                <Text style={styles.modalBtnText}>{isHindi ? 'याद दिलाएं' : 'Remind'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClear} onPress={() => {
                clearDue(selectedFarmer!._id, selectedFarmer!.farmer.name, selectedFarmer!.netDue);
                setSelectedFarmer(null);
              }}>
                <Text style={styles.modalBtnText}>{isHindi ? 'रिकवर' : 'Recover'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  content: { flex: 1, padding: 12 },

  dateRangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#00000010',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  dateRangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dateRangeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  dateRangeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  applyBtn: {
    backgroundColor: '#16A34A',
    padding: 10,
    borderRadius: 10,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 16, elevation: 2, borderLeftWidth: 4, minHeight: 80, justifyContent: 'center' },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', marginBottom: 2, textTransform: 'uppercase' },
  statVal: { fontSize: 18, fontWeight: '900' },

  sectionHeader: { marginTop: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  badge: { backgroundColor: '#F87171', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },

  farmerScroll: { marginBottom: 10 },
  farmerCard: { backgroundColor: '#FFF', width: 110, padding: 12, borderRadius: 20, marginRight: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16A34A15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { color: '#16A34A', fontSize: 18, fontWeight: 'bold' },
  farmerCardName: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 2 },
  farmerCardAmount: { fontSize: 14, fontWeight: '900', color: '#DC2626' },

  typeFilterScroll: { marginBottom: 8 },
  typeChip: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  typeChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  typeChipText: { color: '#64748B', fontWeight: '800', fontSize: 11 },
  typeChipTextActive: { color: '#FFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },

  historyCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 8, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  historyMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyFarmer: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  historyDate: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  methodBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  methodBadgeText: { fontSize: 9, fontWeight: 'bold' },
  historyAmountWrapper: { alignItems: 'flex-end', justifyContent: 'center' },
  historyAmount: { fontSize: 16, fontWeight: '900' },
  historyNote: { fontSize: 11, color: '#64748B', marginTop: 8, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold', marginTop: 8 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B' },
  modalNetDue: { backgroundColor: '#FFF1F2', padding: 16, borderRadius: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FECDD3' },
  modalNetDueLabel: { fontSize: 12, color: '#E11D48', fontWeight: 'bold', marginBottom: 2 },
  modalNetDueVal: { fontSize: 28, fontWeight: '900', color: '#9F1239' },
  modalSectionTitle: { fontSize: 15, fontWeight: '900', color: '#334155', marginBottom: 12 },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  logDate: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  logNote: { fontSize: 11, color: '#64748B' },
  logAmount: { fontSize: 14, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalRemind: { flex: 1, backgroundColor: '#0F172A', padding: 14, borderRadius: 16, alignItems: 'center' },
  modalClear: { flex: 1, backgroundColor: '#16A34A', padding: 14, borderRadius: 16, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  modalTxInfo: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16 },
  modalTxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTxLabel: { fontSize: 12, color: '#64748B', fontWeight: '800' },
  modalTxVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalTxSub: { fontSize: 13, color: '#334155', fontWeight: 'bold' },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  itemQty: { fontSize: 12, color: '#64748B' },
  itemTotal: { fontSize: 15, fontWeight: '900', color: '#0F172A' },

  noteContainer: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12, marginTop: 10 },
  noteLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 5, textTransform: 'uppercase' },
  noteVal: { fontSize: 14, color: '#334155' },

  variantBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  variantBadgeText: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },

  closeBtnFooter: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  closeBtnText: { color: '#475569', fontWeight: 'bold' }
});

