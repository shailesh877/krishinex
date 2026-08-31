// app/(buyer)/orders.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';

type OrderStatus = 'delivered' | 'pending' | 'cancelled';

type Order = {
  id: string;
  farmer: string;
  crop: string;
  qty: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

const dummyOrders: Order[] = [
  { id: '1', farmer: 'राम सिंह', crop: 'गेहूं', qty: '500kg', amount: '₹25,000', status: 'delivered', date: '01/01/26' },
  { id: '2', farmer: 'सीता देवी', crop: 'धान', qty: '300kg', amount: '₹18,000', status: 'pending', date: '31/12/25' },
  { id: '3', farmer: 'मोहन लाल', crop: 'मक्का', qty: '750kg', amount: '₹32,500', status: 'cancelled', date: '30/12/25' },
];

const statusColors: Record<OrderStatus, string> = {
  delivered: '#10B981',
  pending: '#F59E0B',
  cancelled: '#EF4444',
};

export default function BuyerOrders() {
  const router = useRouter();
  const { lang } = useI18n();

  const texts = {
    hi: {
      title: 'मेरे ऑर्डर',
      status: {
        delivered: 'पहुंचा',
        pending: 'लंबित',
        cancelled: 'रद्द',
      } as Record<OrderStatus, string>,
      filter: 'फिल्टर',
    },
    en: {
      title: 'My Orders',
      status: {
        delivered: 'Delivered',
        pending: 'Pending',
        cancelled: 'Cancelled',
      } as Record<OrderStatus, string>,
      filter: 'Filter',
    },
  };

  const t = texts[lang];

  const renderOrder: ListRenderItem<Order> = ({ item }) => {
    const color = statusColors[item.status];
    const label = t.status[item.status];

    return (
      <TouchableOpacity style={styles.orderCard} activeOpacity={0.9}>
        <View style={styles.orderHeader}>
          <Text style={styles.farmerName}>{item.farmer}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.cropText}>
            {item.crop} • {item.qty}
          </Text>
          <Text style={styles.amountText}>{item.amount}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={16} color="#6B7280" />
          <Text style={styles.filterText}>{t.filter}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dummyOrders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  filterText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  orderDetails: {},
  cropText: { fontSize: 15, color: '#6B7280', marginBottom: 4 },
  amountText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  dateText: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
