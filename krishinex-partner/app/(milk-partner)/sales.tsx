import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  StatusBar,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';
import { getSocket } from '../../services/socket';

export default function MilkSalesScreen() {
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [shift, setShift] = useState<'Morning' | 'Evening'>('Morning');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Delivery Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [quantityLiters, setQuantityLiters] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'Completed' | 'Skipped'>('Completed');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminCommissionPercent, setAdminCommissionPercent] = useState(10);

  const fetchDeliveryList = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${BASE_API_URL}/milk/partner/delivery-list?date=${todayStr}&shift=${shift}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.list)) {
        const sorted = [...data.list].sort((a, b) => {
          const aDone = (a.log && (a.log.status === 'Completed' || a.log.status === 'Skipped')) ? 1 : (a.isPausedToday ? 2 : 0);
          const bDone = (b.log && (b.log.status === 'Completed' || b.log.status === 'Skipped')) ? 1 : (b.isPausedToday ? 2 : 0);
          return aDone - bDone;
        });
        setCustomers(sorted);
        if (data.adminCommissionPercent !== undefined) {
          setAdminCommissionPercent(data.adminCommissionPercent);
        }
      }
    } catch (e) {
      console.error('Fetch Delivery List Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shift]);

  useEffect(() => {
    setLoading(true);
    fetchDeliveryList();

    // Realtime WebSocket listener
    const s = getSocket();
    if (s) {
      const handleMilkEvent = () => {
        fetchDeliveryList();
      };
      const handleConfigUpdate = (data: any) => {
        if (data?.config?.adminCommissionPercent !== undefined) {
          setAdminCommissionPercent(data.config.adminCommissionPercent);
        }
      };
      s.on('milk_event', handleMilkEvent);
      s.on('config_updated', handleConfigUpdate);
      return () => {
        s.off('milk_event', handleMilkEvent);
        s.off('config_updated', handleConfigUpdate);
      };
    }
  }, [fetchDeliveryList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryList();
  };

  const handleOpenDeliverModal = (item: any) => {
    if (item.isPausedToday) {
      showAlert(
        hi ? 'डिलीवरी रोकी गई है' : 'Delivery Paused',
        hi ? 'इस ग्राहक ने आज के लिए डिलीवरी अस्थायी रूप से रोकी हुई है।' : 'Delivery is paused for this customer today.'
      );
      return;
    }

    if (item.log && item.log.status === 'Completed') {
      showAlert(
        hi ? 'वितरण पूरा हो चुका है' : 'Delivery Completed',
        hi ? 'इस ग्राहक का दूध वितरण पहले ही पूरा हो चुका है।' : 'Delivery has already been completed for this customer.'
      );
      return;
    }

    setSelectedCustomer(item);
    setQuantityLiters(String(item.log?.quantityLiters || item.dailyQuantityLiters || ''));
    setDeliveryStatus(item.log?.status === 'Skipped' ? 'Skipped' : 'Completed');
    setNotes(item.log?.notes || '');
    setModalVisible(true);
  };

  const handleSaveDelivery = async () => {
    const isSkipped = deliveryStatus === 'Skipped';
    const qty = isSkipped ? 0 : Number(quantityLiters);

    if (!isSkipped && (isNaN(qty) || qty <= 0)) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया वैध दूध की मात्रा (लीटर) भरें' : 'Please enter valid milk quantity');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const todayStr = new Date().toISOString().split('T')[0];

      const payload = {
        subscriptionId: selectedCustomer.subscriptionId,
        date: todayStr,
        shift,
        actualQuantityLiters: qty,
        deliveryStatus,
        notes: notes.trim(),
      };

      const res = await fetch(`${BASE_API_URL}/milk/partner/record-delivery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(
          hi ? 'डिलीवरी दर्ज हुई! 🎉' : 'Delivery Recorded! 🎉',
          data.message || (hi ? 'दूध डिलीवरी सफलतापूर्वक दर्ज कर ली गई है।' : 'Delivery recorded successfully.')
        );
        setModalVisible(false);

        // Animate smooth layout transition and push completed/skipped customer to bottom
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCustomers(prev => {
          const updated = prev.map(c => {
            if (String(c.subscriptionId) === String(selectedCustomer.subscriptionId)) {
              return {
                ...c,
                log: data.log || {
                  quantityLiters: qty,
                  ratePerLiter: c.ratePerLiter || 60,
                  totalAmount: Math.round(qty * (c.ratePerLiter || 60) * 100) / 100,
                  status: isSkipped ? 'Skipped' : 'Completed',
                  notes: notes.trim(),
                }
              };
            }
            return c;
          });

          // Sort: Pending customers first, Completed/Skipped/Paused at bottom
          return updated.sort((a, b) => {
            const aDone = (a.log && (a.log.status === 'Completed' || a.log.status === 'Skipped')) ? 1 : (a.isPausedToday ? 2 : 0);
            const bDone = (b.log && (b.log.status === 'Completed' || b.log.status === 'Skipped')) ? 1 : (b.isPausedToday ? 2 : 0);
            return aDone - bDone;
          });
        });
      } else {
        if (data.insufficientWallet) {
          showAlert(
            hi ? '⚠️ ग्राहक का वॉलेट बैलेंस अपर्याप्त' : '⚠️ Insufficient Customer Wallet',
            data.error || (hi
              ? `ग्राहक के वॉलेट में पर्याप्त बैलेंस नहीं है। कृपया ग्राहक से पहले वॉलेट रिचार्ज करने को कहें, उसके बाद ही दूध डिलीवरी दर्ज होगी।`
              : `Customer has insufficient wallet balance. Please ask customer to recharge their wallet before recording delivery.`)
          );
        } else {
          showAlert(hi ? 'त्रुटि' : 'Error', data.error || (hi ? 'डिलीवरी दर्ज नहीं हो सकी' : 'Failed to record delivery'));
        }
      }
    } catch (error: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', error.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const filteredCustomers = customers
    .filter(c => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(s) ||
        (c.phone || '').toLowerCase().includes(s) ||
        (c.address || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const aDone = (a.log && (a.log.status === 'Completed' || a.log.status === 'Skipped')) ? 1 : (a.isPausedToday ? 2 : 0);
      const bDone = (b.log && (b.log.status === 'Completed' || b.log.status === 'Skipped')) ? 1 : (b.isPausedToday ? 2 : 0);
      return aDone - bDone;
    });

  const totalToDeliver = customers.filter(c => !c.isPausedToday).reduce((sum, c) => sum + (c.dailyQuantityLiters || 0), 0);
  const totalDeliveredSoFar = customers.filter(c => c.log && c.log.status === 'Completed').reduce((sum, c) => sum + (c.log.quantityLiters || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* KRISHINEX BRANDED HEADER */}
      <MilkPartnerHeader onRefresh={onRefresh} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {hi ? 'दूध बिक्री / आपूर्ति' : 'Milk Sales & Delivery'}
          </Text>
          <Text style={styles.headerSub}>
            {hi ? 'घरों व ग्राहकों को दूध डिलीवरी करें और वॉलेट कटौती करें' : 'Deliver milk to subscribers and manage handoff'}
          </Text>
        </View>
      </View>

      {/* SHIFT SELECTOR */}
      <View style={styles.shiftContainer}>
        <TouchableOpacity
          style={[styles.shiftBtn, shift === 'Morning' && styles.shiftBtnActive]}
          onPress={() => setShift('Morning')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="sunny-outline"
            size={16}
            color={shift === 'Morning' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.shiftBtnText, shift === 'Morning' && styles.shiftBtnTextActive]}>
            {hi ? 'सुबह (Morning Shift)' : 'Morning Shift'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shiftBtn, shift === 'Evening' && styles.shiftBtnActive]}
          onPress={() => setShift('Evening')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="moon-outline"
            size={16}
            color={shift === 'Evening' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.shiftBtnText, shift === 'Evening' && styles.shiftBtnTextActive]}>
            {hi ? 'शाम (Evening Shift)' : 'Evening Shift'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH & KPI BANNER */}
      <View style={styles.topControlBox}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={hi ? 'ग्राहक का नाम, पता या मोबाइल खोजें...' : 'Search customer by name, address, phone...'}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.summaryStrip}>
          <Text style={styles.summaryText}>
            {hi ? 'डिलीवरी लक्ष्य:' : 'Target:'} <Text style={{ fontWeight: '800', color: '#0F172A' }}>{totalToDeliver} L</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.summaryText}>
            {hi ? 'वितरित:' : 'Delivered:'} <Text style={{ fontWeight: '800', color: '#2563EB' }}>{totalDeliveredSoFar} L</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.summaryText}>
            {hi ? 'ग्राहक:' : 'Customers:'} <Text style={{ fontWeight: '800', color: '#0F172A' }}>{filteredCustomers.length}</Text>
          </Text>
        </View>
      </View>

      {/* CUSTOMER LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>{hi ? 'ग्राहकों की सूची लोड हो रही है...' : 'Loading customer list...'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => String(item.subscriptionId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="bicycle-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई ग्राहक नहीं मिला' : 'No Customers Found'}
              </Text>
              <Text style={styles.emptySub}>
                {hi ? 'इस शिफ्ट के लिए कोई सक्रिय दूध आपूर्ति अनुरोध नहीं है।' : 'No active milk delivery requests for this shift.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCompleted = item.log && item.log.status === 'Completed';
            const isSkipped = item.log && item.log.status === 'Skipped';
            const isPaused = item.isPausedToday;

            return (
              <View style={[
                styles.card,
                isCompleted && styles.cardCompleted,
                isSkipped && styles.cardSkipped,
                isPaused && styles.cardPaused
              ]}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBlue}>
                    <Text style={styles.avatarTxt}>{(item.name || 'C')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerAddress} numberOfLines={1}>
                      {item.address} {item.landmark ? `(${item.landmark})` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{hi ? 'डिलीवरी कोटा' : 'Quota'}</Text>
                    <Text style={styles.statVal}>{item.dailyQuantityLiters} L</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{hi ? 'दर प्रति लीटर' : 'Rate'}</Text>
                    <Text style={styles.statValRate}>₹{item.ratePerLiter}/L</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{hi ? 'शिफ्ट स्थिति' : 'Shift Status'}</Text>
                    {isPaused ? (
                      <Text style={styles.statusPaused}>{hi ? 'रोक (Paused)' : 'Paused'}</Text>
                    ) : isCompleted ? (
                      <Text style={styles.statusDone}>
                        {item.log.quantityLiters}L (₹{item.log.totalAmount})
                      </Text>
                    ) : isSkipped ? (
                      <Text style={styles.statusSkippedTxt}>
                        {hi ? 'छोड़ा गया' : 'Skipped'}
                      </Text>
                    ) : (
                      <Text style={styles.statusPending}>{hi ? 'बाकी (Pending)' : 'Pending'}</Text>
                    )}
                  </View>
                </View>

                {/* ACTION BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isCompleted ? styles.actionBtnDone : styles.actionBtnDeliver,
                    isPaused && { backgroundColor: '#F1F5F9' },
                  ]}
                  onPress={() => handleOpenDeliverModal(item)}
                  disabled={isPaused || isCompleted}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isCompleted ? "checkmark-circle" : "bicycle"}
                    size={16}
                    color={isPaused ? '#94A3B8' : isCompleted ? '#2563EB' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      isCompleted && { color: '#2563EB' },
                      isPaused && { color: '#94A3B8' },
                    ]}
                  >
                    {isPaused
                      ? (hi ? 'सेवा रोकी गई है' : 'Delivery Paused')
                      : isCompleted
                      ? (hi ? 'वितरण पूरा हुआ' : 'Delivery Completed')
                      : isSkipped
                      ? (hi ? 'पुनः प्रयास / संपादित करें' : 'Skipped (Tap to Retry)')
                      : (hi ? 'डिलीवरी दर्ज करें' : 'Record Delivery')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* DELIVERY MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {hi ? 'दूध डिलीवरी प्रविष्टि' : 'Record Milk Delivery'}
                </Text>
                <Text style={styles.modalSub}>
                  {selectedCustomer?.name} • {shift} Shift
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Toggle Delivery Status */}
            <View style={styles.statusToggleRow}>
              <TouchableOpacity
                style={[styles.statusToggleBtn, deliveryStatus === 'Completed' && styles.statusToggleBtnActive]}
                onPress={() => setDeliveryStatus('Completed')}
              >
                <Text style={[styles.statusToggleText, deliveryStatus === 'Completed' && styles.statusToggleTextActive]}>
                  ✓ {hi ? 'डिलीवरी हुई' : 'Delivered'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusToggleBtn, deliveryStatus === 'Skipped' && styles.statusToggleBtnSkipped]}
                onPress={() => setDeliveryStatus('Skipped')}
              >
                <Text style={[styles.statusToggleText, deliveryStatus === 'Skipped' && styles.statusToggleTextSkippedActive]}>
                  ✕ {hi ? 'छोड़ें (ग्राहक नहीं मिला)' : 'Skip Today'}
                </Text>
              </TouchableOpacity>
            </View>

            {deliveryStatus === 'Completed' && (
              <>
                {/* Liters Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {hi ? 'दी गई दूध की मात्रा (लीटर) *' : 'Delivered Quantity (Liters) *'}
                  </Text>
                  <TextInput
                    style={styles.textInputLarge}
                    keyboardType="decimal-pad"
                    placeholder="2"
                    placeholderTextColor="#94A3B8"
                    value={quantityLiters}
                    onChangeText={setQuantityLiters}
                  />
                </View>

                {/* Amount Preview & Net Earnings Credit */}
                {(() => {
                  const grossAmt = Math.round((Number(quantityLiters) || 0) * (selectedCustomer?.ratePerLiter || 60) * 100) / 100;
                  const feeCut = Math.round((grossAmt * (adminCommissionPercent / 100)) * 100) / 100;
                  const netEarn = Math.round((grossAmt - feeCut) * 100) / 100;
                  return (
                    <View style={styles.calcPreviewBox}>
                      <Text style={styles.calcLbl}>
                        {hi ? 'दर:' : 'Rate:'} ₹{selectedCustomer?.ratePerLiter || 60}/L
                      </Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.calcTotal}>
                          {hi ? 'वॉलेट में मिलेगा:' : 'Wallet Credit:'}{' '}
                          <Text style={{ fontWeight: '900', color: '#16A34A' }}>
                            ₹{netEarn}
                          </Text>
                        </Text>
                        {feeCut > 0 && (
                          <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 1 }}>
                            ({hi ? `कुल ₹${grossAmt} - शुल्क ₹${feeCut}` : `Gross ₹${grossAmt} - Fee ₹${feeCut}`})
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })()}
              </>
            )}

            {/* Remarks */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {hi ? 'टिप्पणी / विवरण (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
              </Text>
              <TextInput
                style={styles.textInputNotes}
                placeholder={hi ? 'डोरबेल नहीं बजी, बर्तन रखा था...' : 'Doorbell rang, handoff completed...'}
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleSaveDelivery}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={deliveryStatus === 'Skipped' ? ['#64748B', '#475569'] : ['#2563EB', '#1D4ED8']}
                style={styles.submitGrad}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {deliveryStatus === 'Skipped'
                        ? (hi ? 'छोड़ा गया के रूप में दर्ज करें' : 'Save as Skipped')
                        : (hi ? 'डिलीवरी पुष्टि करें व सेव करें' : 'Confirm Delivery & Deduct')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  shiftContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  shiftBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  shiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  shiftBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  topControlBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 11,
    color: '#64748B',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardCompleted: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  cardSkipped: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cardPaused: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBEB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarBlue: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    marginBottom: 8,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statValRate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  statValWallet: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  statusRow: {
    marginBottom: 10,
  },
  statusPending: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  statusDone: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563EB',
  },
  statusSkippedTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusPaused: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnDeliver: {
    backgroundColor: '#2563EB',
  },
  actionBtnDone: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statusToggleBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  statusToggleBtnSkipped: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusToggleTextActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
  statusToggleTextSkippedActive: {
    color: '#EF4444',
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  textInputLarge: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textInputNotes: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 50,
  },
  calcPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  calcLbl: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  calcTotal: {
    fontSize: 13,
    color: '#1E40AF',
  },
  submitModalBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
