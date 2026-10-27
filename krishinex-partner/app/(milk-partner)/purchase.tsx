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
  ScrollView,
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';
import { getSocket } from '../../services/socket';

const getCurrentShift = (): 'Morning' | 'Evening' => {
  return new Date().getHours() < 12 ? 'Morning' : 'Evening';
};

export default function MilkPurchaseScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [shift, setShift] = useState<'Morning' | 'Evening'>(() => getCurrentShift());

  // Automatically open Morning if AM (<12 PM) or Evening if PM (>=12 PM) on screen focus
  useFocusEffect(
    useCallback(() => {
      setShift(getCurrentShift());
    }, [])
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Collection Entry Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [quantityLiters, setQuantityLiters] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [fatPercentage, setFatPercentage] = useState('');
  const [snfPercentage, setSnfPercentage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCollectionList = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${BASE_API_URL}/milk/partner/collection-list?date=${todayStr}&shift=${shift}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.list)) {
        const sorted = [...data.list].sort((a, b) => {
          const aDone = (a.log && a.log.status === 'Completed') ? 1 : (a.isPausedToday ? 2 : 0);
          const bDone = (b.log && b.log.status === 'Completed') ? 1 : (b.isPausedToday ? 2 : 0);
          return aDone - bDone;
        });
        setFarmers(sorted);
      }
    } catch (e) {
      console.error('Fetch Collection List Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shift]);

  useEffect(() => {
    setLoading(true);
    fetchCollectionList();

    // Realtime WebSocket listener
    const s = getSocket();
    if (s) {
      const handleMilkEvent = () => {
        fetchCollectionList();
      };
      s.on('milk_event', handleMilkEvent);
      return () => {
        s.off('milk_event', handleMilkEvent);
      };
    }
  }, [fetchCollectionList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCollectionList();
  };

  const handleOpenCollectModal = (item: any) => {
    if (item.isPausedToday) {
      showAlert(
        hi ? 'सेवा रुकी हुई है' : 'Service Paused',
        hi ? 'इस किसान की सेवा आज अस्थायी रूप से रोकी गई है।' : 'Milk service is paused for this farmer today.'
      );
      return;
    }

    if (item.log && item.log.status === 'Completed') {
      showAlert(
        hi ? 'संकलन पूरा हो चुका है' : 'Collection Completed',
        hi ? 'इस किसान का संकलन पहले ही पूरा हो चुका है।' : 'Collection has already been completed for this farmer.'
      );
      return;
    }

    setSelectedFarmer(item);
    setQuantityLiters(String(item.log?.quantityLiters || item.dailyQuantityLiters || ''));
    setCustomRate(String(item.log?.ratePerLiter || item.ratePerLiter || 45));
    setFatPercentage(item.log?.fatPercentage ? String(item.log.fatPercentage) : '');
    setSnfPercentage(item.log?.snfPercentage ? String(item.log.snfPercentage) : '');
    setNotes(item.log?.notes || '');
    setModalVisible(true);
  };

  const handleSaveCollection = async () => {
    const qty = Number(quantityLiters);
    if (isNaN(qty) || qty <= 0) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया वैध दूध की मात्रा (लीटर) भरें' : 'Please enter valid milk quantity in liters');
      return;
    }

    const rate = Number(customRate);
    if (isNaN(rate) || rate <= 0) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया वैध दूध दर (₹/लीटर) भरें' : 'Please enter valid rate per liter');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const todayStr = new Date().toISOString().split('T')[0];

      const payload = {
        subscriptionId: selectedFarmer.subscriptionId,
        date: todayStr,
        shift,
        actualQuantityLiters: qty,
        ratePerLiter: rate, // Custom rate decided by partner based on FAT/SNF
        fatPercentage: fatPercentage.trim() ? Number(fatPercentage) : null,
        snfPercentage: snfPercentage.trim() ? Number(snfPercentage) : null,
        notes: notes.trim(),
      };

      const res = await fetch(`${BASE_API_URL}/milk/partner/record-collection`, {
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
          hi ? 'संकलन दर्ज हुआ! 🎉' : 'Collection Recorded! 🎉',
          data.message || (hi ? 'दूध संकलन सफलतापूर्वक दर्ज कर लिया गया है।' : 'Collection recorded successfully.')
        );
        setModalVisible(false);

        // Animate smooth layout transition and push completed farmer to bottom
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFarmers(prev => {
          const updated = prev.map(f => {
            if (String(f.subscriptionId) === String(selectedFarmer.subscriptionId)) {
              return {
                ...f,
                log: data.log || {
                  quantityLiters: qty,
                  ratePerLiter: rate,
                  totalAmount: Math.round(qty * rate * 100) / 100,
                  status: 'Completed',
                  fatPercentage: fatPercentage.trim() ? Number(fatPercentage) : null,
                  snfPercentage: snfPercentage.trim() ? Number(snfPercentage) : null,
                  notes: notes.trim(),
                }
              };
            }
            return f;
          });

          // Sort: Pending farmers first, Completed/Skipped/Paused at the end
          return updated.sort((a, b) => {
            const aDone = (a.log && a.log.status === 'Completed') ? 1 : (a.isPausedToday ? 2 : 0);
            const bDone = (b.log && b.log.status === 'Completed') ? 1 : (b.isPausedToday ? 2 : 0);
            return aDone - bDone;
          });
        });
      } else {
        const errMsg = data.error || (hi ? 'संकलन दर्ज नहीं हो सका' : 'Failed to record collection');
        const isWalletErr = data.requiredBalance !== undefined || data.requiredAmount !== undefined || errMsg.includes('वॉलेट') || errMsg.toLowerCase().includes('wallet');

        if (isWalletErr) {
          showAlert(
            hi ? 'अपर्याप्त वॉलेट बैलेंस' : 'Insufficient Wallet Balance',
            errMsg,
            [
              { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
              {
                text: hi ? 'वॉलेट रिचार्ज करें' : 'Recharge Wallet',
                onPress: () => {
                  setModalVisible(false);
                  router.push('/(milk-partner)/wallet' as any);
                }
              }
            ]
          );
        } else {
          showAlert(hi ? 'त्रुटि' : 'Error', errMsg);
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

  const filteredFarmers = farmers
    .filter(f => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (f.name || '').toLowerCase().includes(s) ||
        (f.phone || '').toLowerCase().includes(s) ||
        (f.address || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const aDone = (a.log && a.log.status === 'Completed') ? 1 : (a.isPausedToday ? 2 : 0);
      const bDone = (b.log && b.log.status === 'Completed') ? 1 : (b.isPausedToday ? 2 : 0);
      return aDone - bDone;
    });

  const totalToCollect = farmers.filter(f => !f.isPausedToday).reduce((sum, f) => sum + (f.dailyQuantityLiters || 0), 0);
  const totalCollectedSoFar = farmers.filter(f => f.log && f.log.status === 'Completed').reduce((sum, f) => sum + (f.log.quantityLiters || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* KRISHINEX BRANDED HEADER */}
      <MilkPartnerHeader onRefresh={onRefresh} showBack={true} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {hi ? 'दूध खरीद / संकलन' : 'Milk Purchase & Collection'}
          </Text>
          <Text style={styles.headerSub}>
            {hi ? 'पंजीकृत डेयरी किसानों से दूध संकलित करें' : 'Collect milk from registered dairy farmers'}
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
            placeholder={hi ? 'किसान का नाम, मोबाइल, गांव खोजें...' : 'Search farmer by name, phone, village...'}
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
            {hi ? 'आज का लक्ष्य:' : 'Target:'} <Text style={{ fontWeight: '800', color: '#0F172A' }}>{totalToCollect} L</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.summaryText}>
            {hi ? 'संकलित:' : 'Collected:'} <Text style={{ fontWeight: '800', color: '#059669' }}>{totalCollectedSoFar} L</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.summaryText}>
            {hi ? 'किसान:' : 'Farmers:'} <Text style={{ fontWeight: '800', color: '#0F172A' }}>{filteredFarmers.length}</Text>
          </Text>
        </View>
      </View>

      {/* FARMER LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.centerText}>{hi ? 'किसानों की सूची लोड हो रही है...' : 'Loading farmer list...'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFarmers}
          keyExtractor={(item) => String(item.subscriptionId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="water-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई किसान नहीं मिला' : 'No Farmers Found'}
              </Text>
              <Text style={styles.emptySub}>
                {hi ? 'इस शिफ्ट के लिए कोई सक्रिय खरीद अनुरोध उपलब्ध नहीं है।' : 'No active milk supply requests for this shift.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCompleted = item.log && item.log.status === 'Completed';
            const isPaused = item.isPausedToday;

            return (
              <View style={[styles.card, isCompleted && styles.cardCompleted, isPaused && styles.cardPaused]}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{(item.name || 'K')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmerName}>{item.name}</Text>
                    <Text style={styles.farmerAddress} numberOfLines={1}>
                      {item.address} {item.landmark ? `(${item.landmark})` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={16} color="#059669" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{hi ? 'दैनिक कोटा' : 'Quota'}</Text>
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
                    ) : (
                      <Text style={styles.statusPending}>{hi ? 'बाकी (Pending)' : 'Pending'}</Text>
                    )}
                  </View>
                </View>

                {/* RECORD OR VIEW BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isCompleted ? styles.actionBtnDone : styles.actionBtnCollect,
                    isPaused && { backgroundColor: '#F1F5F9' },
                  ]}
                  onPress={() => handleOpenCollectModal(item)}
                  disabled={isPaused || isCompleted}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isCompleted ? "checkmark-circle" : "add-circle-outline"}
                    size={16}
                    color={isPaused ? '#94A3B8' : isCompleted ? '#059669' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      isCompleted && { color: '#059669' },
                      isPaused && { color: '#94A3B8' },
                    ]}
                  >
                    {isPaused
                      ? (hi ? 'सेवा रोकी गई है' : 'Service Paused')
                      : isCompleted
                      ? (hi ? 'संकलन पूरा हुआ' : 'Collection Completed')
                      : (hi ? 'दूध संकलन दर्ज करें' : 'Record Collection')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* COLLECTION MODAL */}
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
                  {hi ? 'दूध संकलन प्रविष्टि' : 'Record Milk Collection'}
                </Text>
                <Text style={styles.modalSub}>
                  {selectedFarmer?.name} • {shift} Shift
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Actual Liters Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {hi ? 'वास्तविक दूध मात्रा (लीटर) *' : 'Actual Milk Quantity (Liters) *'}
                </Text>
                <TextInput
                  style={styles.textInputLarge}
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor="#94A3B8"
                  value={quantityLiters}
                  onChangeText={setQuantityLiters}
                />
              </View>

              {/* Quality-based Rate Customization & Expected Total Preview */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>
                    {hi ? 'दूध खरीद दर (₹/लीटर) *' : 'Purchase Rate (₹/Liter) *'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#059669', fontWeight: '800' }}>
                    {hi ? 'गुणवत्ता अनुसार दर तय करें' : 'Adjust as per Quality'}
                  </Text>
                </View>
                <TextInput
                  style={styles.textInputLarge}
                  keyboardType="decimal-pad"
                  placeholder="45"
                  placeholderTextColor="#94A3B8"
                  value={customRate}
                  onChangeText={setCustomRate}
                />
              </View>

              {/* Rate & Expected Total Preview */}
              <View style={styles.calcPreviewBox}>
                <Text style={styles.calcLbl}>
                  {hi ? 'आधार दर:' : 'Base Rate:'} ₹{selectedFarmer?.ratePerLiter || 45}/L | {hi ? 'लागू दर:' : 'Applied Rate:'} ₹{customRate || 0}/L
                </Text>
                <Text style={styles.calcTotal}>
                  {hi ? 'कुल देय राशि:' : 'Total Payable:'}{' '}
                  <Text style={{ fontWeight: '900', color: '#059669' }}>
                    ₹{Math.round((Number(quantityLiters) || 0) * (Number(customRate) || 0) * 100) / 100}
                  </Text>
                </Text>
              </View>

              {/* Quality Testing (Optional) */}
              <View style={styles.qualitySection}>
                <Text style={styles.qualityHeading}>
                  {hi ? 'गुणवत्ता जांच (वैकल्पिक / Optional Quality Test)' : 'Quality Test (Optional)'}
                </Text>
                <View style={styles.qualityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subInputLabel}>FAT %</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      keyboardType="decimal-pad"
                      placeholder="4.5"
                      placeholderTextColor="#94A3B8"
                      value={fatPercentage}
                      onChangeText={setFatPercentage}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subInputLabel}>SNF %</Text>
                    <TextInput
                      style={styles.textInputSmall}
                      keyboardType="decimal-pad"
                      placeholder="8.5"
                      placeholderTextColor="#94A3B8"
                      value={snfPercentage}
                      onChangeText={setSnfPercentage}
                    />
                  </View>
                </View>
              </View>

              {/* Remarks */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'टिप्पणी / विवरण (वैकल्पिक)' : 'Notes / Remarks (Optional)'}</Text>
                <TextInput
                  style={styles.textInputNotes}
                  placeholder={hi ? 'कोई विशेष विवरण...' : 'Any remarks...'}
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleSaveCollection}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#059669', '#047857']}
                  style={styles.submitGrad}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        {hi ? 'संकलन पुष्टि करें व सेव करें' : 'Confirm & Save Collection'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
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
    backgroundColor: '#059669',
    borderColor: '#059669',
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
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  farmerAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    marginBottom: 10,
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
    color: '#059669',
    marginTop: 2,
  },
  statusPending: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 2,
  },
  statusDone: {
    fontSize: 11,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  statusPaused: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnCollect: {
    backgroundColor: '#059669',
  },
  actionBtnDone: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  subInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
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
  textInputSmall: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  calcLbl: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  calcTotal: {
    fontSize: 13,
    color: '#065F46',
  },
  qualitySection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  qualityHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  submitModalBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#059669',
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
