import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authApi } from '../services/api';
import { useCart } from '@/context/CartContext';
import { useI18n } from '@/context/I18nContext';
import { Alert, ActivityIndicator } from 'react-native';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

type PaymentMethod = 'cod' | 'upi' | 'card' | 'wallet';

const INITIAL_ADDRESSES = [
  {
    id: 'home',
    labelHi: 'घर',
    labelEn: 'Home',
    name: '',
    phone: '',
    fullAddress: '',
  },
  {
    id: 'farm',
    labelHi: 'खेत / गोदाम',
    labelEn: 'Farm / Godown',
    name: '',
    phone: '',
    fullAddress: '',
  },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { buyNowItem } = useLocalSearchParams<{ buyNowItem?: string }>();
  const router = useRouter();
  const { language } = useI18n();
  const { cartItems, totalAmount, clearCart } = useCart();
  const hi = language === 'hi';

  const directItem = useMemo(() => (buyNowItem ? JSON.parse(buyNowItem) : null), [buyNowItem]);
  const displayItems = useMemo(() => (directItem ? [directItem] : cartItems), [directItem, cartItems]);

  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState<'home' | 'farm'>('home');
  const [addressNote, setAddressNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState({ balance: 0, discount: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [userStatus, setUserStatus] = useState('pending');

  React.useEffect(() => {
    fetchWalletConfig();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data) {
        if (res.data.status) {
          setUserStatus(res.data.status);
        }
        setAddresses(prev => prev.map(a => ({
          ...a,
          name: res.data.name || 'User',
          phone: res.data.phone || '',
          fullAddress: res.data.address || (hi ? 'पता सेट नहीं है' : 'Address not set')
        })));
      }
    } catch (e) {
      console.warn('Failed to fetch profile for checkout:', e);
    }
  };

  const fetchWalletConfig = async () => {
    try {
      const res = await authApi.getWalletConfig();
      setWalletInfo({
        balance: res.data.walletBalance || 0,
        discount: res.data.walletDiscountPercentage || 0,
      });
    } catch (e) {
      console.warn('Failed to fetch wallet config:', e);
    }
  };

  // Form for editing
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const itemTotal = useMemo(() => (directItem ? directItem.price * directItem.qty : totalAmount), [directItem, totalAmount]);
  const delivery: number = 0;
  
  const discountAmount = useMemo(() => {
    if (paymentMethod === 'wallet' && walletInfo.discount > 0) {
      return Math.round((itemTotal * walletInfo.discount) / 100);
    }
    return 0;
  }, [paymentMethod, itemTotal, walletInfo.discount]);

  const toPay: number = itemTotal + delivery - discountAmount;
  const insufficientWallet = paymentMethod === 'wallet' && walletInfo.balance < toPay;

  const t = {
    title: hi ? 'ऑर्डर की पुष्टि करें' : 'Confirm your order',
    subtitle: hi ? 'डिलीवरी पता और भुगतान जाँचें' : 'Check address and payment',
    address: hi ? 'डिलीवरी पता' : 'Delivery address',
    change: hi ? 'पता प्रबंधित करें' : 'Manage addresses',
    addressNoteLabel: hi ? 'डिलीवरी नोट' : 'Delivery note',
    addressPlaceholder: hi
      ? 'उदाहरण: घर के पास मंदिर, गेट पर कॉल करें...'
      : 'Eg: Near village temple, call at gate...',
    itemsTitle: hi ? 'आपका ऑर्डर' : 'Your items',
    paymentTitle: hi ? 'भुगतान तरीका' : 'Payment method',
    cod: hi ? 'कैश ऑन डिलीवरी' : 'Cash on delivery',
    upi: hi ? 'UPI / Wallet' : 'UPI / Wallet',
    card: hi ? 'कार्ड से भुगतान' : 'Card payment',
    priceDetails: hi ? 'मूल्य विवरण' : 'Price details',
    itemTotal: hi ? 'आइटम कुल' : 'Item total',
    deliveryLabel: hi ? 'डिलीवरी शुल्क' : 'Delivery charges',
    free: hi ? 'फ्री' : 'Free',
    toPay: hi ? 'कुल भुगतान' : 'To pay',
    paySecurely: hi ? 'सुरक्षित भुगतान द्वारा' : 'Securely pay with',
    placeOrder: hi ? 'ऑर्डर प्लेस करें' : 'Place order',
    payingCod: hi ? 'डिलीवरी पर नकद' : 'Cash at delivery',
    payingUpi: hi ? 'UPI / Wallet' : 'UPI / Wallet',
    payingCard: hi ? 'डेबिट / क्रेडिट कार्ड' : 'Debit / credit card',
  };

  const paymentLabel =
    paymentMethod === 'cod'
      ? t.payingCod
      : paymentMethod === 'upi'
        ? t.payingUpi
        : paymentMethod === 'wallet'
          ? (hi ? 'NexCard वॉलेट' : 'NexCard Wallet')
          : t.payingCard;

  const selectedAddress = addresses.find(
    a => a.id === selectedAddressId,
  )!;

  const startEditing = () => {
    setEditName(selectedAddress.name);
    setEditPhone(selectedAddress.phone);
    setEditAddress(selectedAddress.fullAddress);
    setIsEditing(true);
  };

  const saveEdit = () => {
    setAddresses(prev => prev.map(a => a.id === selectedAddressId ? {
      ...a,
      name: editName,
      phone: editPhone,
      fullAddress: editAddress
    } : a));
    setIsEditing(false);
  };

  const handlePlaceOrder = async () => {
    if (userStatus !== 'approved') {
      showAlert(
        hi ? 'वेरिफिकेशन आवश्यक' : 'Verification Required',
        hi 
          ? 'ऑर्डर प्लेस करने के लिए आपका प्रोफाइल वेरीफाइड होना जरूरी है। कृपया अपनी प्रोफाइल पूरी करें और वेरिफिकेशन का इंतजार करें।' 
          : 'Your profile must be verified to place an order. Please complete your profile and wait for verification.',
        [
          { text: hi ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: hi ? 'प्रोफाइल पर जाएँ' : 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      const deliveryAddress = {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        fullAddress: selectedAddress.fullAddress,
        note: addressNote
      };

      await authApi.checkout({
        items: displayItems,
        deliveryAddress,
        paymentMethod
      });

      if (!directItem) clearCart();
      router.replace('/order-success');
    } catch (error) {
      console.error('Order placement error:', error);
      showAlert(
        hi ? 'माफ़ करें' : 'Sorry',
        hi ? 'ऑर्डर प्लेस करने में समस्या हुई!' : 'Failed to place order!'
      );
    } finally {
      setLoading(false);
    }
  };

  const PaymentPill = ({
    value,
    label,
    icon,
  }: {
    value: PaymentMethod;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    const active = paymentMethod === value;
    return (
      <View
        style={[
          styles.paymentPill,
          active && styles.paymentPillActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={active ? '#FFFFFF' : '#6B7280'}
        />
        <Text
          style={[
            styles.paymentPillText,
            active && styles.paymentPillTextActive,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* premium top header */}
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
              {t.title}
            </Text>
            <Text style={styles.appbarSubtitle} numberOfLines={1}>
              {t.subtitle}
            </Text>
          </View>

          <View style={styles.iconBtn}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#16A34A"
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Address card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t.address}</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.linkText}>{t.change}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressRow}>
            {addresses.map(addr => {
              const isActive = selectedAddressId === addr.id;
              const label = hi ? addr.labelHi : addr.labelEn;
              const iconName =
                addr.id === 'home' ? 'home-outline' : 'leaf-outline';
              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressPill,
                    isActive && styles.addressPillActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    setSelectedAddressId(addr.id as 'home' | 'farm')
                  }
                >
                  <Ionicons
                    name={iconName as any}
                    size={16}
                    color={isActive ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.addressPillText,
                      isActive && styles.addressPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!isEditing ? (
            <View style={{ marginTop: 8 }}>
              <View style={styles.addressLineRow}>
                <Text style={styles.addressLine}>
                  {selectedAddress.name} • {selectedAddress.phone}
                </Text>
                <TouchableOpacity onPress={startEditing}>
                  <Text style={styles.editLink}>{hi ? 'बदलें' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressSub}>{selectedAddress.fullAddress}</Text>
            </View>
          ) : (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                placeholder={hi ? 'नाम' : 'Name'}
                value={editName}
                onChangeText={setEditName}
              />
              <TextInput
                style={styles.editInput}
                placeholder={hi ? 'फ़ोन' : 'Phone'}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.editInput, { height: 60 }]}
                placeholder={hi ? 'पूरा पता' : 'Full Address'}
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editBtn, styles.cancelBtn]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelBtnText}>{hi ? 'रद्द' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.saveBtn]}
                  onPress={saveEdit}
                >
                  <Text style={styles.saveBtnText}>{hi ? 'सेव करें' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Delivery note */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.addressNoteLabel}</Text>
          <View style={styles.noteInputWrap}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#6B7280"
            />
            <TextInput
              style={styles.noteInput}
              placeholder={t.addressPlaceholder}
              placeholderTextColor="#9CA3AF"
              multiline
              value={addressNote}
              onChangeText={setAddressNote}
            />
          </View>
        </View>

        {/* Items list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.itemsTitle}</Text>
          {cartItems.map(item => {
            const itemKey = `${item.id}-${item.variantLabel || ''}`;
            const title = hi ? (item.nameHi || item.name) : item.name;
            const unit = hi ? item.unit : item.unitEn;
            const lineTotal = item.price * item.qty;
            return (
              <View key={itemKey} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.itemTitle}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text style={styles.itemSub}>
                    {item.variantLabel ? `${item.variantLabel} • ${unit}` : unit}
                  </Text>
                  <Text style={styles.itemQty}>
                    {hi ? `मात्रा: ${item.qty}` : `Qty: ${item.qty}`}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹ {lineTotal.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Payment methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.paymentTitle}</Text>
          <View style={styles.paymentRow}>
            <TouchableOpacity 
              onPress={() => setPaymentMethod('cod')}
              activeOpacity={0.8}
              style={{ flex: 1 }}
            >
              <PaymentPill
                value="cod"
                label={t.cod}
                icon="cash-outline"
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setPaymentMethod('wallet')}
              activeOpacity={0.8}
              style={{ flex: 1 }}
            >
              <PaymentPill
                value="wallet"
                label={hi ? 'वॉलिट' : 'Wallet'}
                icon="wallet-outline"
              />
            </TouchableOpacity>
          </View>
          {paymentMethod === 'wallet' && (
            <View style={{ marginTop: 10, padding: 10, backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#10B981' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#064E3B' }}>{hi ? 'उपलब्ध बैलेंस:' : 'Available Balance:'}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>₹ {walletInfo.balance.toLocaleString('en-IN')}</Text>
              </View>
              {walletInfo.discount > 0 && (
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#047857', marginTop: 4 }}>
                  {hi ? `✨ वॉलेट पेमेंट पर ${walletInfo.discount}% की छूट मिलेगी!` : `✨ Get ${walletInfo.discount}% off with Wallet payment!`}
                </Text>
              )}
              {insufficientWallet && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626', marginTop: 6 }}>
                  {hi ? '⚠️ वॉलेट में अपर्याप्त बैलेंस है!' : '⚠️ Insufficient wallet balance!'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Price details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.priceDetails}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.itemTotal}</Text>
            <Text style={styles.priceValue}>
              ₹ {itemTotal.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.deliveryLabel}</Text>
            <Text style={[styles.priceValue, { color: '#16A34A' }]}>
              {delivery === 0
                ? t.free
                : `₹ ${delivery.toLocaleString('en-IN')}`}
            </Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: '#059669', fontWeight: '700' }]}>
                {hi ? `वॉलेट छूट (-${walletInfo.discount}%)` : `Wallet Discount (-${walletInfo.discount}%)`}
              </Text>
              <Text style={[styles.priceValue, { color: '#059669' }]}>
                - ₹ {discountAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          <View style={styles.priceRowTotal}>
            <Text style={styles.priceTotalLabel}>{t.toPay}</Text>
            <Text style={styles.priceTotalValue}>
              ₹ {toPay.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>{t.toPay}</Text>
          <Text style={styles.bottomPrice}>
            ₹ {toPay.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.bottomSub}>
            {t.paySecurely} {paymentLabel}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePlaceOrder}
          disabled={loading || insufficientWallet}
          style={[styles.bottomBtn, (loading || insufficientWallet) && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <>
              <Text style={styles.bottomBtnText}>{t.placeOrder}</Text>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#ECFDF5"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#F3F4F6',
    paddingTop: 16,
  },

  // premium top header
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

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
  },

  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  addressRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  addressPillActive: {
    backgroundColor: KHETIFY_GREEN_DARK,
    borderColor: KHETIFY_GREEN_DARK,
  },
  addressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginLeft: 4,
  },
  addressPillTextActive: {
    color: '#FFFFFF',
  },
  addressLine: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  addressSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
  },

  noteInputWrap: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#111827',
    maxHeight: 80,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  itemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemQty: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginLeft: 8,
  },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paymentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  paymentPillActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  paymentPillText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 6,
    fontWeight: '700',
  },
  paymentPillTextActive: {
    color: '#FFFFFF',
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  priceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  priceTotalValue: {
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
  bottomSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: KHETIFY_GREEN_DARK,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ECFDF5',
    marginRight: 6,
  },

  // Address editing styles
  addressLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },
  editForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  editInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  saveBtn: {
    backgroundColor: KHETIFY_GREEN_DARK,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
