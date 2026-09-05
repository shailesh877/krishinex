import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL, BASE_URL, FILES_BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

export default function RechargeFarmerScreen() {
  
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [pendingCollection, setPendingCollection] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/employee/recharge-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCollection(data.pendingAmount || 0);
      }
    } catch (e) {
      console.error('Fetch stats error:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/employee/recharge-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (e) {
      console.error('Fetch history error:', e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 10) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया वैध मोबाइल या कार्ड नंबर दर्ज करें' : 'Please enter a valid mobile or card number');
      return;
    }

    setSearchLoading(true);
    setFarmer(null);
    setSearchResults([]);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/employee/farmer-lookup?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          if (data.length === 1) {
            setFarmer(data[0]);
          } else {
            setSearchResults(data);
          }
        } else {
          setFarmer(data);
        }
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || (isHindi ? 'किसान नहीं मिला' : 'Farmer not found'));
      }
    } catch (error) {
      console.error('Search error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'खोजने में विफल' : 'Failed to search');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!farmer) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया वैध राशि दर्ज करें' : 'Please enter a valid amount');
      return;
    }

    showAlert(
      isHindi ? 'पुष्टि करें' : 'Confirm Recharge',
      isHindi 
        ? `क्या आप ${farmer.name} के वॉलेट को ₹${amount} से रिचार्ज करना चाहते हैं?`
        : `Are you sure you want to recharge ${farmer.name}'s wallet with ₹${amount}?`,
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'हाँ, रिचार्ज करें' : 'Yes, Recharge',
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${API_URL}/employee/recharge-farmer`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                  cardNumber: farmer.cardNumber, 
                  phone: farmer.phone,
                  amount: Number(amount) 
                }) });

              const data = await res.json();
              if (res.ok) {
                showAlert(
                  isHindi ? 'सफलता' : 'Success',
                  isHindi 
                    ? `${farmer.name} का वॉलेट ₹${amount} से रिचार्ज हो गया है।`
                    : `${farmer.name}'s wallet recharged with ₹${amount}.`,
                  [{ text: 'OK' }]
                );
                setFarmer(null);
                setSearchQuery('');
                setAmount('');
                fetchStats();
                fetchHistory();
              } else {
                showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || (isHindi ? 'रिचार्ज विफल रहा' : 'Recharge failed'));
              }
            } catch (error) {
              console.error('Recharge error:', error);
              showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'सर्वर त्रुटि' : 'Server error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isHindi ? 'किसान वॉलेट रिचार्ज' : 'Farmer Wallet Recharge'}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.statsCard}>
          <View>
            <Text style={styles.statsLabel}>{isHindi ? 'कुल जमा राशि (नकद)' : 'Pending Collection (Cash)'}</Text>
            <Text style={styles.statsValue}>₹{pendingCollection}</Text>
          </View>
          <View style={styles.statsIcon}>
            <Ionicons name="cash" size={24} color="#FFF" opacity={0.8} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* SEARCH BOX */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{isHindi ? 'किसान को खोजें' : 'Find Farmer'}</Text>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={isHindi ? 'मोबाइल या कार्ड नंबर' : 'Mobile or Card Number'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="number-pad"
            />
            <TouchableOpacity 
              style={styles.searchBtn} 
              onPress={handleSearch}
              disabled={searchLoading}
            >
              {searchLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="arrow-forward" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* MULTIPLE RESULTS SELECTION */}
        {searchResults.length > 1 && !farmer && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {isHindi ? 'खाता चुनें' : 'Select Account'} ({searchResults.length})
            </Text>
            {searchResults.map((item, idx) => (
              <TouchableOpacity 
                key={item._id || idx} 
                style={[styles.selectionItem, idx !== searchResults.length - 1 && styles.borderBottom]}
                onPress={() => {
                  setFarmer(item);
                  setSearchResults([]);
                }}
              >
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionName}>
                    {item.name} 
                    <Text style={styles.roleTag}> ({item.role})</Text>
                  </Text>
                  <Text style={styles.selectionSubText}>{item.phone} • {item.address || (isHindi ? 'कोई पता नहीं' : 'No address')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={STATUS_GREEN} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* FARMER DETAILS & RECHARGE */}
        {farmer && (
          <View style={[styles.card, styles.farmerCard]}>
            <View style={styles.farmerHeader}>
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.name}</Text>
                <Text style={styles.farmerSubText}>{farmer.address}</Text>
                <View style={styles.balanceTag}>
                  <Text style={styles.balanceTagLabel}>{isHindi ? 'वर्तमान बैलेंस:' : 'Current Balance:'}</Text>
                  <Text style={styles.balanceTagValue}>₹{farmer.walletBalance || 0}</Text>
                </View>
              </View>
              {farmer.profilePhotoUrl ? (
                <Image 
                  source={{ uri: farmer.profilePhotoUrl.startsWith('http') ? farmer.profilePhotoUrl : `${FILES_BASE_URL}/${farmer.profilePhotoUrl.replace(/\\/g, '/')}` }} 
                  style={styles.farmerAvatar} 
                />
              ) : (
                <View style={[styles.farmerAvatar, styles.farmerAvatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={STATUS_GREEN} />
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isHindi ? 'रिचार्ज राशि (₹)' : 'Recharge Amount (₹)'}</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.rechargeBtn, loading && styles.disabledBtn]}
              onPress={handleRecharge}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.rechargeBtnText}>{isHindi ? 'रिचार्ज कन्फर्म करें' : 'Confirm Recharge'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* HISTORY */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>{isHindi ? 'हालिया रिचार्ज' : 'Recent Recharges'}</Text>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyHistoryText}>{isHindi ? 'कोई रिचार्ज इतिहास नहीं' : 'No recharge history yet'}</Text>
            </View>
          ) : (
            history.map((item, index) => {
              const isDebit = item.type === 'Debit';
              return (
                <View key={item._id || index} style={styles.historyItem}>
                  <View style={[styles.historyIcon, isDebit && styles.historyIconDebit]}>
                    <Ionicons name={isDebit ? "arrow-down" : "arrow-up"} size={16} color={isDebit ? "#EF4444" : STATUS_GREEN} />
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyName}>
                      {isDebit ? (isHindi ? 'नकद जमा (ऑफिस)' : 'Cash Deposit (Office)') : (item.recipient?.name || 'Farmer')}
                    </Text>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString(isHindi ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                  </View>
                  <Text style={[styles.historyAmount, isDebit && styles.historyAmountDebit]}>
                    {isDebit ? '-' : '+'} ₹{item.amount}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 16,
    paddingBottom: 25,
    paddingHorizontal: 20,
    backgroundColor: STATUS_GREEN,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5 },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  statsLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4 },
  statsValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800' },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center' },
  scrollContent: {
    padding: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    height: 54 },
  inputIcon: {
    marginRight: 10 },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500' },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: STATUS_GREEN,
    alignItems: 'center',
    justifyContent: 'center' },
  farmerCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0' },
  farmerHeader: {
    flexDirection: 'row',
    alignItems: 'center' },
  farmerInfo: {
    flex: 1 },
  farmerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2 },
  farmerSubText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10 },
  balanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start' },
  balanceTagLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600' },
  balanceTagValue: {
    fontSize: 13,
    color: STATUS_GREEN,
    fontWeight: '800',
    marginLeft: 4 },
  farmerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#F1F5F9' },
  farmerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center' },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20 },
  inputGroup: {
    marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginLeft: 2 },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8 },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginRight: 10 },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: STATUS_GREEN },
  rechargeBtn: {
    backgroundColor: STATUS_GREEN,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STATUS_GREEN,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8 },
  rechargeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5 },
  disabledBtn: { opacity: 0.7 },
  historyContainer: {
    marginTop: 10 },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 15,
    marginLeft: 4 },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9' },
  emptyHistoryText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500' },
  historyItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2 },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12 },
  historyIconDebit: {
    backgroundColor: '#FEF2F2' },
  historyDetails: {
    flex: 1 },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B' },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2 },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: STATUS_GREEN },
  historyAmountDebit: {
    color: '#EF4444' },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12 },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6' },
  selectionInfo: {
    flex: 1,
    marginRight: 10 },
  selectionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B' },
  roleTag: {
    fontSize: 12,
    color: STATUS_GREEN,
    fontWeight: '600',
    textTransform: 'capitalize' },
  selectionSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2 } });
