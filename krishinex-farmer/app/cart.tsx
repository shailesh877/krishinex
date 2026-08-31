import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '@/context/I18nContext';
import { useCart } from '@/context/CartContext';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const { cartItems, updateQty, totalAmount } = useCart();
  const [refreshing, setRefreshing] = React.useState(false);
  const hi = language === 'hi';

  const items = cartItems;
  const itemTotal = totalAmount;
  const delivery: number = 0;
  const toPay: number = itemTotal + delivery;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* premium top header (statusbar + header ek group) */}
      <View style={styles.topShell}>
        <View style={styles.appbar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.appbarMiddle}>
            <Text style={styles.appbarTitle} numberOfLines={1}>
              {hi ? 'कार्ट' : 'Cart'}
            </Text>
            <Text style={styles.appbarSubtitle} numberOfLines={1}>
              {hi ? 'आपके चुने हुए उत्पाद' : 'Your selected items'}
            </Text>
          </View>

          <View style={styles.iconBtn}>
            <Ionicons name="cart" size={18} color="#111827" />
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="cart-outline"
            size={48}
            color="#9CA3AF"
          />
          <Text style={styles.emptyTitle}>
            {hi ? 'आपकी कार्ट खाली है' : 'Your cart is empty'}
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push('/(tabs)/shop')}
          >
            <Text style={styles.shopBtnText}>
              {hi ? 'खरीदारी शुरू करें' : 'Start shopping'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[KHETIFY_GREEN_DARK]} />
            }
          >
            {items.map(item => {
              const itemKey = `${item.id}-${item.variantLabel || ''}`;
              const title = hi ? (item.nameHi || item.name) : item.name;
              const unit = hi ? item.unit : item.unitEn;
              const lineTotal = item.price * item.qty;
              return (
                <View key={itemKey} style={styles.row}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.rowImg}
                  />
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text
                      style={styles.rowTitle}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                    <Text style={styles.rowSub}>
                      {item.variantLabel ? `${item.variantLabel} • ${unit}` : unit}
                    </Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(item.id, -1, item.variantLabel)}
                      >
                        <Ionicons name="remove" size={16} color="#4B5563" />
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{item.qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(item.id, 1, item.variantLabel)}
                      >
                        <Ionicons name="add" size={16} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.rowPrice}>
                    ₹ {lineTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })}

            {/* price summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {hi ? 'मूल्य विवरण' : 'Price details'}
              </Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {hi ? 'आइटम कुल' : 'Item total'}
                </Text>
                <Text style={styles.summaryValue}>
                  ₹ {itemTotal.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {hi ? 'डिलीवरी' : 'Delivery'}
                </Text>
                <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                  {delivery === 0
                    ? hi
                      ? 'फ्री'
                      : 'Free'
                    : `₹ ${delivery.toLocaleString('en-IN')}`}
                </Text>
              </View>
              <View style={styles.summaryRowTotal}>
                <Text style={styles.summaryTotalLabel}>
                  {hi ? 'कुल भुगतान' : 'To pay'}
                </Text>
                <Text style={styles.summaryTotalValue}>
                  ₹ {toPay.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* bottom bar */}
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.bottomLabel}>
                {hi ? 'कुल भुगतान' : 'To pay'}
              </Text>
              <Text style={styles.bottomPrice}>
                ₹ {toPay.toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bottomBtn}
              activeOpacity={0.9}
              onPress={() => router.push('/checkout')}
            >
              <Text style={styles.bottomBtnText}>
                {hi ? 'ऑर्डर प्लेस करें' : 'Place order'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: 16,
  },

  // premium top shell (statusbar + header ek group)
  topShell: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  appbar: {
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

  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  rowImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qtyVal: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  rowPrice: { fontSize: 13, fontWeight: '900', color: '#111827' },

  summaryCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 12, color: '#6B7280' },
  summaryValue: { fontSize: 12, color: '#111827', fontWeight: '700' },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  bottomPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  bottomBtn: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: KHETIFY_GREEN_DARK,
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
