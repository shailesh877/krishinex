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
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { showAlert } from '../../components/CustomAlert';

const STATUS_GREEN = '#6bb313ff';

export default function GenerateCardScreen() {
  
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [cardInput, setCardInput] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [reqId, setReqId] = useState('');

  useEffect(() => {
    // Initialize MSG91 Widget headless
    OTPWidget.initializeWidget("366361727571383132303632", "497379TbOp9la7qwjr69a483dbP1");
  }, []);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'कृपया कम से कम 3 अंक दर्ज करें' : 'Please enter at least 3 characters'
      );
      return;
    }

    setSearchLoading(true);
    setSelectedUser(null);
    setSearchResults([]);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_API_URL}/employee/farmer-lookup?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          if (data.length === 1) {
            setSelectedUser(data[0]);
          } else {
            setSearchResults(data);
          }
        } else {
          setSelectedUser(data);
        }
      } else {
        showAlert(
          isHindi ? 'त्रुटि' : 'Error',
          data.error || (isHindi ? 'कोई उपयोगकर्ता नहीं मिला' : 'No user found')
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'खोजने में विफल' : 'Failed to search');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!selectedUser) return;
    if (!cardInput || !cardInput.trim()) {
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'कृपया पहले कार्ड नंबर दर्ज करें' : 'Please enter card number first'
      );
      return;
    }

    setSendingOtp(true);
    try {
      // Bypass for Play Store dummy account
      if (selectedUser.phone === '9519519519') {
        setOtpSent(true);
        showAlert(
          isHindi ? 'सफलता (Dummy)' : 'Success (Dummy)',
          isHindi 
            ? `Dummy OTP (9519) भेज दिया गया है` 
            : `Dummy OTP (9519) has been sent`
        );
        setSendingOtp(false);
        return;
      }

      const identifier = selectedUser.phone.startsWith('91') ? selectedUser.phone : `91${selectedUser.phone}`;
      console.log('Sending Headless OTP via Widget:', identifier);
      const widgetRes = await OTPWidget.sendOTP({ identifier });
      console.log('Widget Send Response:', widgetRes);

      if (widgetRes?.type === 'success' || widgetRes?.message?.includes('success') || widgetRes?.message === 'OTP sent successfully') {
        const retrievedReqId = widgetRes?.message || widgetRes?.reqId || widgetRes?.data?.reqId || '';
        setReqId(retrievedReqId);
        setOtpSent(true);
        showAlert(
          isHindi ? 'सफलता' : 'Success',
          isHindi 
            ? `OTP ${selectedUser.phone} पर भेज दिया गया है` 
            : `OTP sent to ${selectedUser.phone}`
        );
      } else {
        showAlert(
          isHindi ? 'त्रुटि' : 'Error', 
          widgetRes?.message || (isHindi ? 'OTP भेजने में विफल' : 'Failed to send OTP')
        );
      }
    } catch (e: any) {
      console.error('Send OTP error:', e);
      showAlert(
        isHindi ? 'त्रुटि' : 'Error', 
        e?.message || (isHindi ? 'कनेक्शन त्रुटि' : 'Connection error')
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleAssignCard = async () => {
    if (!selectedUser) return;
    if (!cardInput || !cardInput.trim()) {
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'कृपया कार्ड नंबर दर्ज करें' : 'Please enter a card number'
      );
      return;
    }
    if (!otp || otp.trim().length !== 4) {
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'कृपया सही 4-अंकीय OTP दर्ज करें' : 'Please enter a valid 4-digit OTP'
      );
      return;
    }

    showAlert(
      isHindi ? 'पुष्टि करें' : 'Confirm Assignment',
      isHindi 
        ? `क्या आप ${selectedUser.name} को कार्ड नंबर ${cardInput} आवंटित करना चाहते हैं?`
        : `Are you sure you want to assign card number ${cardInput} to ${selectedUser.name}?`,
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'हाँ, आवंटित करें' : 'Yes, Assign',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Verify OTP
              if (selectedUser.phone === '9519519519') {
                if (otp.trim() !== '9519') {
                  showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'गलत OTP दर्ज किया गया है' : 'Invalid OTP entered');
                  setLoading(false);
                  return;
                }
              } else {
                const identifier = selectedUser.phone.startsWith('91') ? selectedUser.phone : `91${selectedUser.phone}`;
                console.log(`Verifying Widget OTP for ${identifier} via Widget`);
                const verifyRes = await OTPWidget.verifyOTP({ identifier, otp: otp.trim(), reqId });
                console.log('Widget Verify Response:', verifyRes);

                if (verifyRes.type !== 'success' && verifyRes.message !== 'OTP verified successfully') {
                  showAlert(
                    isHindi ? 'त्रुटि' : 'Error',
                    verifyRes.message || (isHindi ? 'गलत OTP दर्ज किया गया है' : 'Invalid OTP entered')
                  );
                  setLoading(false);
                  return;
                }
              }

              // 2. Call Card assignment
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${BASE_API_URL}/employee/admin/generate-card/${selectedUser._id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cardNumber: cardInput.trim() }) });

              const data = await res.json();
              if (res.ok) {
                showAlert(
                  isHindi ? 'सफलता' : 'Success',
                  isHindi 
                    ? `कार्ड सफलतापूर्वक आवंटित कर दिया गया है!` 
                    : `Card assigned successfully!`,
                  [{ text: 'OK' }]
                );
                setSelectedUser(null);
                setSearchQuery('');
                setCardInput('');
                setOtp('');
                setOtpSent(false);
              } else {
                showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || (isHindi ? 'आवंटन विफल रहा' : 'Assignment failed'));
              }
            } catch (error) {
              console.error('Card generation error:', error);
              showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'सर्वर त्रुटि' : 'Server error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setSearchResults([]);
    setOtp('');
    setOtpSent(false);
    setReqId('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isHindi ? 'NexCard आवंटन' : 'NexCard Assignment'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* SEARCH BOX */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{isHindi ? 'यूज़र खोजें (मोबाइल/कार्ड नंबर)' : 'Find User (Mobile/Card Number)'}</Text>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={isHindi ? 'मोबाइल नंबर या कार्ड दर्ज करें' : 'Enter mobile or card number'}
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
        {searchResults.length > 0 && !selectedUser && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {isHindi ? 'उपयोगकर्ता चुनें' : 'Select User'} ({searchResults.length})
            </Text>
            {searchResults.map((item, idx) => (
              <TouchableOpacity 
                key={item._id || idx} 
                style={[styles.selectionItem, idx !== searchResults.length - 1 && styles.borderBottom]}
                onPress={() => selectUser(item)}
              >
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionName}>
                    {item.name} 
                    <Text style={styles.roleTag}> ({item.role})</Text>
                  </Text>
                  <Text style={styles.selectionSubText}>{item.phone} • {item.address || (isHindi ? 'पता नहीं' : 'No address')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={STATUS_GREEN} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* USER DETAILS & CARD GENERATION */}
        {selectedUser && (
          <View style={[styles.card, styles.userCard]}>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.userName}>{selectedUser.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{selectedUser.role}</Text>
                  </View>
                </View>
                <Text style={styles.userSubText}>{selectedUser.phone}</Text>
                <Text style={styles.userAddress}>{selectedUser.address}</Text>
              </View>
              {selectedUser.profilePhotoUrl ? (
                <Image 
                  source={{ uri: selectedUser.profilePhotoUrl.startsWith('http') ? selectedUser.profilePhotoUrl : `${FILES_BASE_URL}/${selectedUser.profilePhotoUrl.replace(/\\/g, '/')}` }} 
                  style={styles.userAvatar} 
                />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={STATUS_GREEN} />
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* CARD STATUS */}
            {selectedUser.cardNumber ? (
              <View style={styles.assignedCardBox}>
                <Ionicons name="card-outline" size={28} color="#059669" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.cardStatusLabel}>{isHindi ? 'आवंटित NexCard नंबर' : 'Assigned NexCard Number'}</Text>
                  <Text style={styles.cardStatusValue}>{selectedUser.cardNumber}</Text>
                </View>
              </View>
            ) : (
              <View>
                {/* CARD INPUT */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{isHindi ? 'NexCard नंबर दर्ज करें *' : 'Enter NexCard Number *'}</Text>
                  <View style={styles.cardInputWrapper}>
                    <Ionicons name="card-outline" size={20} color="#475569" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.cardInput}
                      placeholder={isHindi ? 'कार्ड नंबर दर्ज करें' : 'Enter Card Number'}
                      value={cardInput}
                      onChangeText={setCardInput}
                      autoCapitalize="characters"
                      editable={!otpSent}
                    />
                  </View>
                </View>

                {/* OTP INPUT (IF SENT) */}
                {otpSent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{isHindi ? 'OTP दर्ज करें *' : 'Enter OTP *'}</Text>
                    <View style={styles.cardInputWrapper}>
                      <Ionicons name="keypad-outline" size={20} color="#475569" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.cardInput}
                        placeholder="••••"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                  </View>
                )}

                {/* DYNAMIC ACTION BUTTON */}
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.assignBtn, (sendingOtp || !cardInput.trim()) && styles.disabledBtn, { marginTop: 10 }]}
                    onPress={handleSendOtp}
                    disabled={sendingOtp || !cardInput.trim()}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.assignBtnText}>{isHindi ? 'OTP भेजें' : 'Send OTP'}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.assignBtn, (loading || otp.length !== 4) && styles.disabledBtn]}
                      onPress={handleAssignCard}
                      disabled={loading || otp.length !== 4}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.assignBtnText}>{isHindi ? 'सत्यापित और आवंटित करें' : 'Verify & Assign NexCard'}</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={sendingOtp}
                      style={{ alignSelf: 'center', paddingVertical: 4 }}
                    >
                      <Text style={{ color: STATUS_GREEN, fontSize: 13, fontWeight: '700' }}>
                        {isHindi ? 'OTP दोबारा भेजें' : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: STATUS_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24 },
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
    color: '#FFF' },
  scrollContent: {
    padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0' },
  sectionLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12 },
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
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500' },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: STATUS_GREEN,
    alignItems: 'center',
    justifyContent: 'center' },
  userCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0' },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center' },
  userInfo: {
    flex: 1 },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8 },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6 },
  roleBadgeText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
    textTransform: 'uppercase' },
  userSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500' },
  userAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2 },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F1F5F9' },
  userAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center' },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16 },
  assignedCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 16,
    borderRadius: 16 },
  cardStatusLabel: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600' },
  cardStatusValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: '#065F46',
    marginTop: 2,
    letterSpacing: 1.5 },
  inputGroup: {
    marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8 },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6 },
  cardInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: STATUS_GREEN,
    letterSpacing: 2 },
  inventoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8 },
  inventoryScroll: {
    flexDirection: 'row' },
  inventoryCardBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8 },
  inventoryCardText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#475569' },
  assignBtn: {
    backgroundColor: STATUS_GREEN,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STATUS_GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5 },
  assignBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800' },
  disabledBtn: {
    opacity: 0.7 },
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B' },
  roleTag: {
    fontSize: 11,
    color: STATUS_GREEN,
    fontWeight: '600',
    textTransform: 'capitalize' },
  selectionSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2 } });
