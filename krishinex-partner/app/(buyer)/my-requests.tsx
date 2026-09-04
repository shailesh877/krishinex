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
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}/orders`;

type OrderStatus = 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

type BuyRequest = {
  _id: string;
  crop: string;
  quantity: string;
  variety?: string;
  location: string;
  note?: string;
  status: OrderStatus;
  createdAt: string;
};

function statusColor(status: OrderStatus) {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'accepted': return '#3B82F6';
    case 'in-progress': return '#8B5CF6';
    case 'completed': return '#16A34A';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
}

function statusLabel(status: OrderStatus, isHindi: boolean) {
  const labels: Record<OrderStatus, [string, string]> = {
    pending: ['Pending', 'प्रतीक्षारत'],
    accepted: ['Accepted', 'स्वीकृत'],
    'in-progress': ['In Progress', 'जारी है'],
    completed: ['Completed', 'पूर्ण'],
    cancelled: ['Cancelled', 'रद्द'],
  };
  const pair = labels[status] ?? ['Unknown', 'अज्ञात'];
  return isHindi ? pair[1] : pair[0];
}

export default function MyRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [orders, setOrders] = useState<BuyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    hi: {
      title: 'मेरी रिक्वेस्ट',
      sub: 'आपने जो खरीद रिक्वेस्ट की है',
      crop: 'फसल',
      qty: 'मात्रा',
      location: 'लोकेशन',
      created: 'तारीख',
      variety: 'वैरायटी',
      empty: 'अभी तक कोई खरीद रिक्वेस्ट नहीं की है',
      newOrder: 'नयी रिक्वेस्ट',
    },
    en: {
      title: 'My requests',
      sub: 'Buy requests created by you',
      crop: 'Crop',
      qty: 'Qty (qtl)',
      location: 'Location',
      created: 'Date',
      variety: 'Variety',
      empty: 'You have not created any buy request yet',
      newOrder: 'New Request',
    },
  }[lang];

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
          return prev;
        });
      }
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders(false);
      const interval = setInterval(() => fetchOrders(true), 5000);
      return () => clearInterval(interval);
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: BuyRequest }) => (
    <View style={styles.card}>
      {/* Top row: crop name + status badge */}
      <View style={styles.cardHeader}>
        <View style={styles.cropRow}>
          <Ionicons name="leaf-outline" size={16} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={styles.cropText}>{item.crop}</Text>
          {item.variety ? (
            <Text style={styles.varietyText}> · {item.variety}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {statusLabel(item.status, isHindi)}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailRow}>
        <Ionicons name="scale-outline" size={13} color="#6B7280" />
        <Text style={styles.detailText}>{t.qty}: <Text style={styles.detailBold}>{item.quantity} qtl</Text></Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={13} color="#6B7280" />
        <Text style={styles.detailText}>{t.location}: <Text style={styles.detailBold}>{item.location}</Text></Text>
      </View>

      {item.note ? (
        <View style={styles.detailRow}>
          <Ionicons name="chatbox-outline" size={13} color="#6B7280" />
          <Text style={styles.detailText}>{item.note}</Text>
        </View>
      ) : null}

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={13} color="#6B7280" />
        <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backWrap}
          onPress={() => router.push('/(buyer)/create-order')}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(buyer)/create-order')}
        >
          <Ionicons name="add" size={16} color="#16A34A" />
          <Text style={styles.newBtnText}>{t.newOrder}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerBorder} />

      <View style={styles.subHeader}>
        <Text style={styles.subText}>{t.sub}</Text>
        <Text style={styles.countText}>{orders.length} {isHindi ? 'रिक्वेस्ट' : 'requests'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
          contentContainerStyle={
            orders.length === 0
              ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }
              : { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, gap: 12 }
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t.empty}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(buyer)/create-order')}
              >
                <Text style={styles.emptyBtnText}>{t.newOrder}</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backWrap: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center',
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#ECFDF5',
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  headerBorder: { height: 2, backgroundColor: '#87D528' },

  subHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
  },
  subText: { fontSize: 12, color: '#6B7280' },
  countText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // CARD
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  cropRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cropText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  varietyText: { fontSize: 13, color: '#6B7280' },
  statusBadge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 6, marginBottom: 4,
  },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },
  detailBold: { fontWeight: '700', color: '#374151' },

  // EMPTY
  emptyContainer: { alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#16A34A', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

