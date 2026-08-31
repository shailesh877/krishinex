// app/shop-orders.tsx — Shop orders (customer as buyer)

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authApi } from '../services/api';
import { useI18n } from '@/context/I18nContext';
import { ActivityIndicator, RefreshControl } from 'react-native';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

type OrderStatus =
  | 'all'
  | 'new'
  | 'processing'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

export default function ShopOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [filter, setFilter] = useState<OrderStatus>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await authApi.getMyShopOrders();
      setOrders(res.data);
    } catch (error) {
      console.error('Fetch Shop Orders failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  React.useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusConfig = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DELIVERED') {
      return {
        color: '#16A34A',
        icon: 'checkmark-circle-outline' as const,
        label: hi ? 'डिलीवर हो चुका' : 'Delivered',
      };
    }
    if (s === 'IN_PROGRESS' || s === 'OUT_FOR_DELIVERY') {
      return {
        color: '#2563EB',
        icon: 'bicycle-outline' as const,
        label: hi ? 'डिलीवरी पर है' : 'On the Way',
      };
    }
    if (s === 'ACCEPTED') {
      return {
        color: '#10B981',
        icon: 'checkmark-done-outline' as const,
        label: hi ? 'स्वीकार किया' : 'Accepted',
      };
    }
    if (s === 'NEW') {
      return {
        color: '#F97316',
        icon: 'time-outline' as const,
        label: hi ? 'लंबित' : 'Pending',
      };
    }
    return {
      color: '#DC2626',
      icon: 'close-circle-outline' as const,
      label: hi ? 'रद्द' : 'Cancelled',
    };
  };

  const goToShopHome = () => router.push('/(tabs)/shop');
  const goToTrackOrder = (orderId: string) => {
    router.push({
      pathname: '/track-order',
      params: { id: orderId }
    });
  };

  const filterDefs: {
    key: OrderStatus;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
      {
        key: 'all',
        label: hi ? 'सब' : 'All',
        icon: 'layers-outline',
      },
      {
        key: 'new',
        label: hi ? 'नया' : 'New',
        icon: 'sparkles-outline' as any,
      },
      {
        key: 'processing',
        label: hi ? 'स्वीकार' : 'Accepted',
        icon: 'checkmark-outline' as any,
      },
      {
        key: 'out-for-delivery',
        label: hi ? 'डिलीवरी' : 'Out',
        icon: 'bicycle-outline',
      },
      {
        key: 'delivered',
        label: hi ? 'डिलीवर' : 'Done',
        icon: 'checkmark-done-outline',
      },
      {
        key: 'cancelled',
        label: hi ? 'रद्द' : 'Cancelled',
        icon: 'close-circle-outline',
      },
    ];

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'new') {
      return orders.filter(o => o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'IN_PROGRESS');
    }
    const statusMap: any = {
      'new': ['NEW'],
      'processing': ['ACCEPTED'],
      'out-for-delivery': ['IN_PROGRESS'],
      'delivered': ['DELIVERED'],
      'cancelled': ['CANCELLED']
    };
    const target = statusMap[filter] || [filter.toUpperCase()];
    return orders.filter(o => target.includes(o.status));
  }, [filter, orders]);

  const t = {
    title: hi ? 'शॉप ऑर्डर' : 'Shop orders',
    subtitle: hi
      ? 'अपने सभी दुकान ऑर्डर यहां ट्रैक करें'
      : 'Track all your shop orders here',
    emptyTitle: hi
      ? 'कोई शॉप ऑर्डर नहीं है'
      : 'No shop orders yet',
    emptySub: hi
      ? 'अपने आसपास की दुकान से ऑर्डर करें और यहां ट्रैक करें।'
      : 'Place an order from nearby shop and track it here.',
    emptyCta: hi
      ? 'दुकान से ऑर्डर करें'
      : 'Order from shop',
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* premium top header */}
      <View style={styles.topShell}>
        {/* appbar code ... */}
        <View style={styles.appbar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.appbarMiddle}>
            <Text style={styles.appbarTitle} numberOfLines={1}>
              {t.title}
            </Text>
            <Text style={styles.appbarSubtitle} numberOfLines={1}>
              {t.subtitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={goToShopHome}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

        {/* status filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterDefs.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                activeOpacity={0.9}
                onPress={() => setFilter(f.key)}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={active ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={KHETIFY_GREEN_DARK} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="document-text-outline"
            size={46}
            color="#9CA3AF"
          />
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptySub}>{t.emptySub}</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={goToShopHome}
          >
            <Text style={styles.shopBtnText}>{t.emptyCta}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={KHETIFY_GREEN_DARK} />
          }
        >
          {filteredOrders.map(order => {
            const itemsSummary = order.items.map((it: any) => it.name).join(', ');
            const statusCfg = getStatusConfig(order.status);
            const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity
                key={order._id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => goToTrackOrder(order._id)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.leftRow}>
                    <View
                      style={[
                        styles.statusIconWrap,
                        {
                          backgroundColor: `${statusCfg.color}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={statusCfg.icon}
                        size={18}
                        color={statusCfg.color}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={styles.title}
                        numberOfLines={1}
                      >
                        {itemsSummary}
                      </Text>
                      <Text
                        style={styles.sub}
                        numberOfLines={1}
                      >
                        {hi
                          ? `ऑर्डर आईडी: ${order._id.slice(-6).toUpperCase()}`
                          : `Order ID: ${order._id.slice(-6).toUpperCase()}`}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>
                      ₹ {order.totalAmount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.qtyText}>
                      {hi
                        ? `आइटम्स: ${order.items.length}`
                        : `Items: ${order.items.length}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.statusPill}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusCfg.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusCfg.color },
                      ]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>
                    {hi
                      ? `ऑर्डर दिनांक: ${date}`
                      : `Placed on ${date}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#F3F4F6',
    paddingTop: 16,
  },

  // premium top header + filter
  topShell: {
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#F9FAFB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  appbar: {
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  appbarMiddle: {
    flex: 1,
    marginHorizontal: 8,
  },
  appbarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  appbarSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  filterScroll: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: KHETIFY_GREEN_DARK,
    borderColor: KHETIFY_GREEN_DARK,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginLeft: 4,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  shopBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: KHETIFY_GREEN_DARK,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },

  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  qtyText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
