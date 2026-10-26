import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../services/api';
import { useI18n } from '@/context/I18nContext';
import { showAlert } from '@/components/CustomAlert';

export default function MilkRegisterScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'sell' | 'buy' }>();
  const isSell = type === 'sell';

  const { language } = useI18n();
  const hi = language === 'hi';

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [schedule, setSchedule] = useState<'Morning Only' | 'Evening Only' | 'Morning and Evening'>('Morning Only');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setFetchingProfile(true);
      const [profileRes, subRes] = await Promise.all([
        authApi.getProfile(),
        authApi.getMyMilkSubscription()
      ]);

      if (profileRes.data) {
        setName(profileRes.data.name || '');
        setPhone(profileRes.data.phone || '');
        setEmail(profileRes.data.email || '');
        setAddress(profileRes.data.address || '');
        const verified = profileRes.data.status === 'approved' || profileRes.data.kycStatus === 'verified';
        setIsVerified(verified);
      }

      // Check if user already has ANY pending or active subscription
      const existingSub = subRes.data?.subscription;
      if (existingSub && ['pending', 'approved', 'paused'].includes(existingSub.status)) {
        const isSellSub = existingSub.type === 'sell';
        const typeStr = isSellSub ? (hi ? 'दूध बिक्री' : 'Milk Sell') : (hi ? 'दूध खरीद' : 'Milk Buy');
        const statusStr = existingSub.status === 'pending' ? (hi ? 'समीक्षाधीन (Pending)' : 'Pending') : (hi ? 'सक्रिय (Active)' : 'Active');
        
        showAlert(
          hi ? 'पहले से सदस्यता मौजूद है' : 'Subscription Already Exists',
          hi
            ? `आपकी ${typeStr} की सेवा पहले से ही ${statusStr} स्थिति में है। आप एक साथ दूसरा फॉर्म नहीं भर सकते।`
            : `You already have an existing ${statusStr} ${typeStr} subscription. You cannot submit another form.`,
          [
            {
              text: hi ? 'ठीक है' : 'OK',
              onPress: () => router.replace(isSellSub ? ('/milk/sell-history' as any) : ('/milk/buy-history' as any))
            }
          ]
        );
      }
    } catch (e) {
      console.warn('Could not prefill profile:', e);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleSubmit = async () => {
    if (!isVerified) {
      showAlert(
        hi ? 'सत्यापन आवश्यक (Verification Required)' : 'Verification Required',
        hi
          ? 'दूध सेवा में आवेदन करने के लिए आपका किसान प्रोफ़ाइल सत्यापित (Verified / Approved) होना आवश्यक है। कृपया पहले अपनी KYC व प्रोफ़ाइल सत्यापन पूरा करें।'
          : 'Your farmer profile must be verified/approved before applying for Milk Service. Please complete your profile KYC verification first.'
      );
      return;
    }

    if (!name.trim()) return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.');
    if (!phone.trim()) return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया मोबाइल नंबर दर्ज करें।' : 'Please enter phone number.');
    if (!address.trim()) return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया पूरा पता दर्ज करें।' : 'Please enter full address.');
    if (!quantity || Number(quantity) <= 0) {
      return showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया दूध की सही मात्रा (लीटर) दर्ज करें।' : 'Please enter valid milk quantity in liters.');
    }

    try {
      setLoading(true);
      const payload = {
        type: isSell ? 'sell' : 'buy',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        dailyQuantityLiters: Number(quantity),
        deliverySchedule: schedule,
      };

      const res = await authApi.registerMilk(payload);
      if (res.data?.success) {
        if (res.data.subscription) {
          await AsyncStorage.setItem('cached_milk_sub', JSON.stringify(res.data.subscription));
        }
        showAlert(
          hi ? 'अनुरोध सफलतापूर्वक भेजा गया' : 'Request Submitted Successfully',
          hi
            ? 'आपका दूध पंजीकरण अनुरोध एडमिन स्वीकृति हेतु भेज दिया गया है। एडमिन द्वारा स्वीकृति के बाद सेवा सक्रिय हो जाएगी।'
            : 'Your milk subscription request has been submitted for admin approval. The service will be activated once approved.',
          [
            {
              text: hi ? 'ठीक है' : 'OK',
              onPress: () => router.replace(isSell ? ('/milk/sell-history' as any) : ('/milk/buy-history' as any)),
            },
          ]
        );
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || (hi ? 'पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।' : 'Registration failed. Please try again.');
      showAlert(hi ? 'त्रुटि' : 'Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>
              {isSell ? (hi ? 'दूध बेचने हेतु पंजीकरण' : 'Register to Sell Milk') : (hi ? 'दूध खरीदने हेतु पंजीकरण' : 'Register to Buy Milk')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isSell ? (hi ? 'दैनिक दूध आपूर्ति पंजीकरण' : 'Daily Milk Supply Registration') : (hi ? 'दैनिक दूध खरीद सदस्यता' : 'Daily Milk Purchase Subscription')}
            </Text>
          </View>
        </View>

        {fetchingProfile ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* NOTICE BANNER */}
            <View style={styles.noticeBox}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.noticeText}>
                {hi
                  ? 'पंजीकरण के बाद एडमिन द्वारा विवरण की पुष्टि व भाव तय किया जाएगा। इसके बाद हिस्ट्री पेज पर दैनिक आपूर्ति दिखेगी।'
                  : 'After submission, admin will review your details and confirm the applicable rate per liter.'}
              </Text>
            </View>

            {/* FORM CARD */}
            <View style={styles.formCard}>
              {/* NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'पूरा नाम *' : 'Full Name *'}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={hi ? 'उदा. रमेश कुमार' : 'e.g. Ramesh Kumar'}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* PHONE */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'मोबाइल नंबर *' : 'Mobile Number *'}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+91 9876543210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'ईमेल आईडी (वैकल्पिक)' : 'Email ID (Optional)'}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ramesh@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* QUANTITY */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isSell ? (hi ? 'दैनिक दूध की मात्रा (लीटर) *' : 'Daily Milk Quantity (Liters) *') : (hi ? 'प्रतिदिन आवश्यक दूध (लीटर) *' : 'Daily Required Milk (Liters) *')}
                </Text>
                <View style={styles.qtyInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder={hi ? 'उदा. 5' : 'e.g. 5'}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />
                  <View style={styles.unitBox}>
                    <Text style={styles.unitText}>{hi ? 'लीटर' : 'Liters'}</Text>
                  </View>
                </View>
              </View>

              {/* DELIVERY SCHEDULE (FOR BOTH BUY & SELL MILK) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isSell
                    ? (hi ? 'दूध देने का समय (Schedule) *' : 'Supply Schedule *')
                    : (hi ? 'दूध प्राप्ति / डिलीवरी समय (Schedule) *' : 'Delivery Schedule *')}
                </Text>
                <View style={styles.scheduleRow}>
                  {(['Morning Only', 'Evening Only', 'Morning and Evening'] as const).map(item => {
                    const isSelected = schedule === item;
                    let label: string = item;
                    if (hi) {
                      if (item === 'Morning Only') label = 'केवल सुबह';
                      else if (item === 'Evening Only') label = 'केवल शाम';
                      else label = 'सुबह व शाम दोनों';
                    }
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.scheduleBtn, isSelected && styles.scheduleBtnActive]}
                        onPress={() => setSchedule(item)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? '#059669' : '#94A3B8'}
                        />
                        <Text style={[styles.scheduleText, isSelected && styles.scheduleTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ADDRESS */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'पूरा पता (गाँव / वार्ड / घर संख्या) *' : 'Full Address *'}</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder={hi ? 'मकान नंबर, गाँव/शहर, पिन कोड...' : 'House number, village/town, pin code...'}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* LANDMARK */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{hi ? 'नजदीकी लैंडमार्क (Landmark)' : 'Nearby Landmark'}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={hi ? 'उदा. शिव मंदिर के पास / मुख्य सड़क' : 'e.g. Near Shiv Temple / Main road'}
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {hi ? 'अनुरोध सबमिट करें' : 'Submit Application'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitBox: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  scheduleRow: {
    gap: 8,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  scheduleBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  scheduleTextActive: {
    color: '#065F46',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#059669',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
