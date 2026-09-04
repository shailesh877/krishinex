import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';

const API_URL = `${BASE_API_URL}/shop`;

interface Product {
  _id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl: string;
  hasVariants?: boolean;
  variants?: any[];
  stockQty: number;
}

interface CartItem {
  itemRef: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  variantLabel?: string;
  imageUrl?: string;
}

interface Farmer {
  _id: string;
  name: string;
  phone: string;
  walletBalance: number;
  availableAgriCredit: number;
  profilePhotoUrl?: string;
}

export default function POSScreen() {
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [farmerIdentifier, setFarmerIdentifier] = useState('');
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [isSearchingFarmer, setIsSearchingFarmer] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'WALLET' | 'DUE' | 'SPLIT'>('CASH');
  const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, wallet: 0, due: 0, shopDue: 0 });

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [searchOtpModalVisible, setSearchOtpModalVisible] = useState(false);
  const [searchOtp, setSearchOtp] = useState('');
  
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualItem, setManualItem] = useState({ name: '', price: '', quantity: '1', unit: 'Pcs' });

  useEffect(() => {
    fetchMyProducts();
  }, []);

  // --- API CALLS ---
  const fetchMyProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/items/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Fetch products error', e);
    } finally {
      setIsLoadingProducts(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    fetchMyProducts();
  }, []);

  const searchFarmer = async () => {
    if (!farmerIdentifier) return;
    try {
      setIsSearchingFarmer(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/pos/search-initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ identifier: farmerIdentifier }),
      });
      if (res.ok) {
        const data = await res.json();
        setFarmer(data);
        showAlert(isHindi ? 'सफलता' : 'Success', isHindi ? 'किसान का विवरण मिल गया है' : 'Farmer details found');
      } else {
        const data = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || (isHindi ? 'किसान नहीं मिला' : 'Farmer not found'));
      }
    } catch (e) {
      console.error('Search farmer error', e);
    } finally {
      setIsSearchingFarmer(false);
    }
  };

  const verifyFarmerSearchOTP = async () => {
    if (!searchOtp || searchOtp.length < 6) return;
    try {
      setIsSearchingFarmer(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/pos/search-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ identifier: farmerIdentifier, otp: searchOtp }),
      });
      if (res.ok) {
        const data = await res.json();
        setFarmer(data);
        setSearchOtpModalVisible(false);
        setSearchOtp('');
      } else {
        const data = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Invalid OTP');
      }
    } catch (e) {
      console.error('Verify farmer search OTP error', e);
    } finally {
      setIsSearchingFarmer(false);
    }
  };

  const createPOSOrder = async () => {
    if (!farmer) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया किसान चुनें' : 'Please select a farmer');
      return;
    }
    if (cart.length === 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कार्ट खाली है' : 'Cart is empty');
      return;
    }

    const total = calculateTotal();
    const sumBreakdown = (paymentBreakdown.cash || 0) + (paymentBreakdown.wallet || 0) + (paymentBreakdown.due || 0) + (paymentBreakdown.shopDue || 0);

    if (Math.abs(sumBreakdown - total) > 1) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'पेमेंट ब्रेकडाउन कुल राशि से मेल नहीं खाता' : 'Payment breakdown does not match total amount');
      return;
    }

    if (paymentBreakdown.wallet > (farmer.walletBalance || 0)) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'अपर्याप्त NexCard वॉलेट बैलेंस' : 'Insufficient NexCard Wallet balance');
      return;
    }

    if (paymentBreakdown.due > (farmer.availableAgriCredit || 0)) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'अपर्याप्त कृषि-क्रेडिट बैलेंस (Udhaar)' : 'Insufficient Agri-Credit balance (Udhaar)');
      return;
    }

    try {
      setIsCreatingOrder(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/pos/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farmerId: farmer._id,
          items: cart,
          paymentBreakdown,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveOrderId(data.orderId);
        setOtpModalVisible(true);
      } else {
        const err = await res.json();
        showAlert('Error', err.error || 'Failed to create order');
      }
    } catch (e) {
      console.error('Create POS order error', e);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const verifyOTPAndFinalize = async () => {
    if (!otp || otp.length < 6) return;
    try {
      setIsCreatingOrder(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/pos/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: activeOrderId,
          otp,
        }),
      });

      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'बिक्री पूरी हुई' : 'Sale completed successfully');
        resetPOS();
      } else {
        const err = await res.json();
        showAlert('Error', err.error || 'Invalid OTP');
      }
    } catch (e) {
      console.error('Verify OTP error', e);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // --- LOGIC ---
  const addToCart = (product: Product, variant?: any) => {
    const itemRef = product._id;
    const variantLabel = variant ? variant.label : undefined;
    const price = variant ? Number(variant.price) : product.price;

    setCart((prev) => {
      const existing = prev.find((item) => item.itemRef === itemRef && item.variantLabel === variantLabel);
      if (existing) {
        return prev.map((item) =>
          item.itemRef === itemRef && item.variantLabel === variantLabel
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          itemRef,
          name: product.name,
          price,
          quantity: 1,
          unit: product.unit,
          variantLabel,
          imageUrl: product.imageUrl,
        },
      ];
    });
    setShowProductPicker(false);
  };

  const addManualToCart = () => {
    if (!manualItem.name || !manualItem.price) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया नाम और कीमत दर्ज करें' : 'Please enter name and price');
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        itemRef: '', // Empty or null for manual
        name: manualItem.name,
        price: Number(manualItem.price),
        quantity: Number(manualItem.quantity),
        unit: manualItem.unit,
      },
    ]);
    setManualItem({ name: '', price: '', quantity: '1', unit: 'Pcs' });
    setShowManualModal(false);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const resetPOS = () => {
    setCart([]);
    setFarmer(null);
    setFarmerIdentifier('');
    setPaymentBreakdown({ cash: 0, wallet: 0, due: 0, shopDue: 0 });
    setOtpModalVisible(false);
    setOtp('');
    setActiveOrderId(null);
    setPaymentMode('CASH');
  };

  const setFullCash = () => {
    const total = calculateTotal();
    setPaymentBreakdown({ cash: total, wallet: 0, due: 0, shopDue: 0 });
  };

  const setFullWallet = () => {
    const total = calculateTotal();
    setPaymentBreakdown({ cash: 0, wallet: total, due: 0, shopDue: 0 });
  };

  const setFullDue = () => {
    const total = calculateTotal();
    setPaymentBreakdown({ cash: 0, wallet: 0, due: total, shopDue: 0 });
  };

  const setFullShopDue = () => {
    const total = calculateTotal();
    setPaymentBreakdown({ cash: 0, wallet: 0, due: 0, shopDue: total });
  };

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 16) + 4 : 24 }]}>
        <Text style={styles.title}>{isHindi ? 'बिक्री (POS)' : 'Point of Sale'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={() => router.push('/(shop-partner)/notifications' as any)}>
            <NotificationIcon size={24} color="#16A34A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetPOS}>
            <Text style={styles.resetText}>{isHindi ? 'साफ़ करें' : 'Reset'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
      >
        {/* FARMER SEARCH */}
        <View style={styles.card}>
          <Text style={styles.label}>{isHindi ? 'किसान चुनें' : 'Identify Farmer'}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={isHindi ? 'फोन नंबर या कार्ड नंबर' : 'Phone or Card Number'}
              value={farmerIdentifier}
              onChangeText={setFarmerIdentifier}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={searchFarmer} disabled={isSearchingFarmer}>
              {isSearchingFarmer ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {farmer && (
            <View style={styles.farmerDetail}>
              <Ionicons name="person-circle" size={40} color="#16A34A" />
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.name}</Text>
                <Text style={styles.farmerPhone}>{farmer.phone}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                  <View style={styles.creditChip}>
                    <Text style={styles.creditText}>
                      {isHindi ? 'NexCard वॉलेट: ' : 'NexCard Wallet: '} ₹{farmer.walletBalance}
                    </Text>
                  </View>
                  <View style={[styles.creditChip, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.creditText, { color: '#1E40AF' }]}>
                      {isHindi ? 'कृषि-क्रेडिट: ' : 'Agri-Credit: '} ₹{farmer.availableAgriCredit}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setFarmer(null)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CART SECTION */}
        <View style={[styles.card, { minHeight: 200 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{isHindi ? 'आइटम' : 'Items'}</Text>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowProductPicker(true)}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>{isHindi ? 'इन्वेंट्री' : 'Inventory'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#111827' }]} onPress={() => setShowManualModal(true)}>
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>{isHindi ? 'मैनुअल' : 'Manual'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>{isHindi ? 'कोई आइटम नहीं' : 'No items in cart'}</Text>
            </View>
          ) : (
            cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.cartItemMain}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  {!item.itemRef && <Text style={[styles.variantTag, { color: '#6B7280' }]}>{isHindi ? '(मैनुअल)' : '(Manual)'}</Text>}
                  {item.variantLabel && <Text style={styles.variantTag}>{item.variantLabel}</Text>}
                  <Text style={styles.cartItemPrice}>₹{item.price} / {item.unit}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => updateQuantity(index, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={16} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(index, 1)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={16} />
                  </TouchableOpacity>
                  <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(index)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* PAYMENT BREAKDOWN */}
        {cart.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>{isHindi ? 'पेमेंट का विवरण' : 'Payment Breakdown'}</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{isHindi ? 'कुल राशि:' : 'Total Amount:'}</Text>
              <Text style={styles.totalValue}>₹{calculateTotal()}</Text>
            </View>

            <View style={styles.paymentInputs}>
              <View style={styles.payOption}>
                <Text style={styles.payLabel}>{isHindi ? 'नकद (Cash)' : 'Cash'}</Text>
                <TextInput
                  style={styles.payInput}
                  keyboardType="numeric"
                  value={String(paymentBreakdown.cash)}
                  onChangeText={(v) => setPaymentBreakdown({ ...paymentBreakdown, cash: Number(v) || 0 })}
                />
              </View>
              <View style={styles.payOption}>
                <Text style={styles.payLabel}>{isHindi ? 'क्रेडिट (Wallet)' : 'Wallet/Credit'}</Text>
                <TextInput
                  style={styles.payInput}
                  keyboardType="numeric"
                  value={String(paymentBreakdown.wallet)}
                  onChangeText={(v) => setPaymentBreakdown({ ...paymentBreakdown, wallet: Number(v) || 0 })}
                />
              </View>
              <View style={styles.payOption}>
                <Text style={styles.payLabel}>{isHindi ? 'उधार (Due)' : 'Due (Agri-Credit)'}</Text>
                <TextInput
                  style={styles.payInput}
                  keyboardType="numeric"
                  value={String(paymentBreakdown.due)}
                  onChangeText={(v) => setPaymentBreakdown({ ...paymentBreakdown, due: Number(v) || 0 })}
                />
              </View>
              <View style={styles.payOption}>
                <Text style={[styles.payLabel, { color: '#111827', fontWeight: 'bold' }]}>{isHindi ? 'शॉप उधार (Shop Due)' : 'Shop Udhaar'}</Text>
                <TextInput
                  style={[styles.payInput, { backgroundColor: '#FFEDD5' }]}
                  keyboardType="numeric"
                  value={String(paymentBreakdown.shopDue)}
                  onChangeText={(v) => setPaymentBreakdown({ ...paymentBreakdown, shopDue: Number(v) || 0 })}
                />
              </View>
            </View>

            <View style={styles.quickPayRow}>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#DCFCE7' }]} onPress={setFullCash}>
                <Text style={[styles.quickBtnText, { color: '#15803D' }]}>Full Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#DBEAFE' }]} onPress={setFullWallet}>
                <Text style={[styles.quickBtnText, { color: '#1D4ED8' }]}>Full Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#FCE7F3' }]} onPress={setFullDue}>
                <Text style={[styles.quickBtnText, { color: '#BE185D' }]}>Full Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#FFEDD5' }]} onPress={setFullShopDue}>
                <Text style={[styles.quickBtnText, { color: '#C2410C' }]}>Shop Udhaar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerTotalLabel}>{isHindi ? 'कुल देय' : 'Total Payable'}</Text>
          <Text style={styles.footerTotalVal}>₹{calculateTotal()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, (isCreatingOrder || !farmer || cart.length === 0 || (paymentBreakdown.wallet > (farmer?.walletBalance || 0)) || (paymentBreakdown.due > (farmer?.availableAgriCredit || 0))) && styles.btnDisabled]}
          onPress={createPOSOrder}
          disabled={isCreatingOrder || !farmer || cart.length === 0 || (paymentBreakdown.wallet > (farmer?.walletBalance || 0)) || (paymentBreakdown.due > (farmer?.availableAgriCredit || 0))}
        >
          {isCreatingOrder ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>{isHindi ? 'ऑर्डर बनाएं' : 'Create Order'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* PRODUCT PICKER MODAL */}
      <Modal visible={showProductPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.productPickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isHindi ? 'आइटम चुनें' : 'Select Product'}</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder={isHindi ? 'खोजें...' : 'Search product...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
              data={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={[styles.productListItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    {item.imageUrl ? (
                      <Image source={{ uri: `${BASE_URL}/${item.imageUrl.replace(/\\/g, '/')}` }} style={{ width: 45, height: 45, borderRadius: 8, marginRight: 10 }} />
                    ) : (
                      <View style={{ width: 45, height: 45, borderRadius: 8, marginRight: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                      </View>
                    )}
                    
                    <View style={styles.productMain}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productMeta}>
                        {item.hasVariants
                          ? (isHindi ? 'वेरिएंट चुनें' : 'Select Variant')
                          : `₹${item.price} / ${item.unit}`}
                        {` • Stock: ${item.stockQty}`}
                      </Text>
                    </View>
                    
                    {!item.hasVariants && (
                      <TouchableOpacity
                        style={[styles.itemAddCircle, (item.stockQty <= 0) && styles.variantDisabled]}
                        onPress={() => addToCart(item)}
                        disabled={item.stockQty <= 0}
                      >
                        <Ionicons name={item.stockQty <= 0 ? "close-circle" : "add"} size={24} color={item.stockQty <= 0 ? "#EF4444" : "#16A34A"} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {item.hasVariants ? (
                    <View style={[styles.variantActions, { marginTop: 10, marginLeft: 55 }]}>
                      {item.variants?.map((v, i) => {
                        const outOfStock = (v.stockQty || 0) <= 0;
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[styles.variantAddBtn, outOfStock && styles.variantDisabled]}
                            onPress={() => addToCart(item, v)}
                            disabled={outOfStock}
                          >
                            <Text style={styles.variantAddText}>{v.label} (₹{v.price})</Text>
                            <Text style={styles.variantStockText}>{outOfStock ? 'NO STOCK' : `Stock: ${v.stockQty}`}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{isHindi ? 'कोई आइटम नहीं मिला' : 'No products found'}</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MANUAL ITEM MODAL */}
      <Modal visible={showManualModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.productPickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isHindi ? 'मैनुअल आइटम जोड़ें' : 'Add Manual Item'}</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{isHindi ? 'आइटम का नाम' : 'Item Name'}</Text>
              <TextInput
                style={styles.modalSearch}
                placeholder={isHindi ? 'जैसे: खाद (Generic)' : 'e.g. Fertilizer (Generic)'}
                value={manualItem.name}
                onChangeText={(v) => setManualItem({ ...manualItem, name: v })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{isHindi ? 'कीमत (Price)' : 'Price'}</Text>
                  <TextInput
                    style={styles.modalSearch}
                    placeholder="₹ 0.00"
                    keyboardType="numeric"
                    value={manualItem.price}
                    onChangeText={(v) => setManualItem({ ...manualItem, price: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{isHindi ? 'मात्रा (Qty)' : 'Quantity'}</Text>
                  <TextInput
                    style={styles.modalSearch}
                    placeholder="1"
                    keyboardType="numeric"
                    value={manualItem.quantity}
                    onChangeText={(v) => setManualItem({ ...manualItem, quantity: v })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{isHindi ? 'यूनिट (Unit)' : 'Unit'}</Text>
              <View style={styles.quickPayRow}>
                {['Pcs', 'Kg', 'Gram', 'Litre', 'Bag', 'Packet'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.quickBtn, manualItem.unit === u && { backgroundColor: '#16A34A' }]}
                    onPress={() => setManualItem({ ...manualItem, unit: u })}
                  >
                    <Text style={[styles.quickBtnText, manualItem.unit === u && { color: '#FFF' }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.verifyBtn, { marginTop: 30 }]} onPress={addManualToCart}>
                <Text style={styles.verifyBtnText}>{isHindi ? 'कार्ट में जोड़ें' : 'Add to Cart'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SEARCH OTP MODAL */}
      <Modal visible={searchOtpModalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
            <View style={[styles.otpCard, { marginBottom: 0 }]}>
              <Ionicons name="person-circle-outline" size={60} color="#16A34A" style={{ alignSelf: 'center' }} />
              <Text style={styles.otpTitle}>{isHindi ? 'पहचान वेरिफिकेशन' : 'Identity Verification'}</Text>
              <Text style={styles.otpSub}>{isHindi ? 'किसान के ऐप में भेजा गया 6-अंकों का OTP दर्ज करें' : 'Enter 6-digit OTP sent to farmer to view details'}</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={searchOtp}
                onChangeText={setSearchOtp}
                autoFocus
              />
              <TouchableOpacity style={styles.verifyBtn} onPress={verifyFarmerSearchOTP} disabled={isSearchingFarmer}>
                {isSearchingFarmer ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyBtnText}>{isHindi ? 'वेरिफाई करें' : 'Verify Farmer'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSearchOtpModalVisible(false)} style={{ marginTop: 15 }}>
                <Text style={styles.cancelText}>{isHindi ? 'कैंसल' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* OTP MODAL */}
      <Modal visible={otpModalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
            <View style={[styles.otpCard, { marginBottom: 0 }]}>
              <Ionicons name="shield-checkmark" size={60} color="#16A34A" style={{ alignSelf: 'center' }} />
              <Text style={styles.otpTitle}>{isHindi ? 'OTP वेरिफिकेशन' : 'OTP Verification'}</Text>
              <Text style={styles.otpSub}>{isHindi ? 'किसान की ऐप/SMS से OTP दर्ज करें' : 'Enter the OTP sent to farmer'}</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
              <TouchableOpacity style={styles.verifyBtn} onPress={verifyOTPAndFinalize}>
                {isCreatingOrder ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyBtnText}>{isHindi ? 'कन्फर्म करें' : 'Confirm Sale'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)} style={{ marginTop: 15 }}>
                <Text style={styles.cancelText}>{isHindi ? 'कैंसल' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  resetText: { color: '#EF4444', fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  label: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 5, marginTop: 10 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 16 },
  searchBtn: { backgroundColor: '#16A34A', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', width: 50 },
  farmerDetail: { marginTop: 15, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  farmerInfo: { flex: 1, marginLeft: 10 },
  farmerName: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  farmerPhone: { fontSize: 13, color: '#15803D' },
  creditChip: { backgroundColor: '#BBF7D0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
  creditText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, gap: 5 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  emptyCart: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', marginTop: 10 },
  cartItem: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 12 },
  cartItemMain: { marginBottom: 8 },
  cartItemName: { fontSize: 16, fontWeight: '600' },
  variantTag: { color: '#16A34A', fontSize: 12, fontWeight: 'bold' },
  cartItemPrice: { color: '#6B7280', fontSize: 13 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  qtyBtn: { backgroundColor: '#F3F4F6', padding: 4, borderRadius: 6 },
  qtyText: { fontSize: 16, fontWeight: 'bold' },
  itemTotal: { flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#111827' },
  removeBtn: { marginLeft: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 15 },
  totalLabel: { fontSize: 18, fontWeight: '800' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#16A34A' },
  paymentInputs: { marginTop: 15, gap: 12 },
  payOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payLabel: { fontSize: 14, color: '#4B5563' },
  payInput: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, width: 100, textAlign: 'right', fontWeight: 'bold' },
  quickPayRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  quickBtn: { flex: 1, backgroundColor: '#E5E7EB', padding: 8, borderRadius: 8, alignItems: 'center' },
  quickBtnText: { fontSize: 11, fontWeight: 'bold', color: '#4B5563' },
  footer: { backgroundColor: '#FFF', padding: 20, paddingBottom: 35, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },
  footerInfo: { flex: 1 },
  footerTotalLabel: { fontSize: 12, color: '#6B7280' },
  footerTotalVal: { fontSize: 24, fontWeight: '900', color: '#111827' },
  checkoutBtn: { backgroundColor: '#111827', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  productPickerCard: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSearch: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 15 },
  productListItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  productMain: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  itemAddCircle: { backgroundColor: '#F0FDF4', padding: 8, borderRadius: 25 },
  variantActions: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  variantAddBtn: { backgroundColor: '#16A34A', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  variantAddText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  variantStockText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600' },
  variantDisabled: { backgroundColor: '#F3F4F6', opacity: 0.5 },
  otpCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 30, width: '90%', alignSelf: 'center', marginBottom: 250 },
  otpTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 15 },
  otpSub: { textAlign: 'center', color: '#6B7280', marginTop: 5 },
  otpInput: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 15, fontSize: 32, fontWeight: '900', letterSpacing: 10, textAlign: 'center', marginTop: 25 },
  verifyBtn: { backgroundColor: '#16A34A', padding: 20, borderRadius: 15, marginTop: 20, alignItems: 'center' },
  verifyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  cancelText: { textAlign: 'center', color: '#9CA3AF', fontWeight: '700' },
});
