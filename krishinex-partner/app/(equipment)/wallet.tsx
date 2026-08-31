import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}/rentals`;

type Transaction = {
  _id: string;
  transactionId: string;
  amount: number;
  totalAmount?: number;
  commissionAmount?: number;
  type: 'Payout' | 'Collection' | 'Credit' | 'Debit';
  paymentMode: string;
  status: 'Pending' | 'Completed' | 'Failed';
  module: string;
  note: string;
  createdAt: string;
};

export default function EquipmentWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    hi: {
      title: 'वॉलेट और कमाई',
      balanceLabel: 'कुल बैलेंस',
      transactionsLabel: 'हाल के लेन-देन',
      payout: 'पेआउट (क्रेडिट)',
      collection: 'कलेक्शन (डेबिट)',
      status: {
        Pending: 'प्रतीक्षारत',
        Completed: 'सफल',
        Failed: 'विफल'
      },
      empty: 'अभी तक कोई लेन-देन नहीं है',
    },
    en: {
      title: 'Wallet & Earnings',
      balanceLabel: 'Total Balance',
      transactionsLabel: 'Recent Transactions',
      payout: 'Payout (Credit)',
      collection: 'Collection (Debit)',
      status: {
        Pending: 'Pending',
        Completed: 'Completed',
        Failed: 'Failed'
      },
      empty: 'No transactions yet',
    },
  }[lang];

  const fetchWallet = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error('Wallet fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const onRefresh = () => { setRefreshing(true); fetchWallet(); };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: Transaction }) => {
    const isPayout = item.type === 'Payout' || item.type === 'Credit';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: isPayout ? '#F0FDF4' : '#FFF7ED' }]}>
            <Ionicons
              name={isPayout ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
              size={24}
              color={isPayout ? "#16A34A" : "#F97316"}
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
        {item.totalAmount && item.commissionAmount ? (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Booking:</Text>
              <Text style={styles.breakdownValue}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Admin Commission ({Math.round((item.commissionAmount / item.totalAmount) * 100)}%):</Text>
              <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>- ₹{item.commissionAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.netRow]}>
              <Text style={styles.netLabel}>Net Payout:</Text>
              <Text style={styles.netValue}>₹{item.amount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        ) : (
          item.note ? <Text style={styles.noteText}>{item.note}</Text> : null
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

      <LinearGradient colors={['#16A34A', '#15803D']} style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
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
      </LinearGradient>

      <Text style={styles.sectionTitle}>{t.transactionsLabel}</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  topSection: {
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceCard: {
    alignItems: 'center',
  },
  balanceSub: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  idText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noteText: {
    marginTop: 10,
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  netRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  netValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
});
