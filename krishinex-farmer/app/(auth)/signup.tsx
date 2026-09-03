// app/(auth)/signup.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { authApi } from '../../services/api';
import { showAlert } from '@/components/CustomAlert';

const KHETIFY_GREEN_DARK = '#4b7d0a';
const KHETIFY_GREEN_LIGHT = '#a3d546';
const SHADOW_COLOR = '#00000020';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const hi = language === 'hi';

  const params = useLocalSearchParams<{ phone?: string }>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(params.phone || '');
  const [email, setEmail] = useState('');
  
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  const t = {
    title: hi ? 'नया अकाउंट बनाएँ' : 'Create New Account',
    subtitle: hi
      ? 'अपना प्रोफ़ाइल बनाएँ और खेती की सभी सर्विस एक ही जगह पाएँ'
      : 'Create your profile and access all farming services in one place',
    nameLabel: hi ? 'पूरा नाम' : 'Full name',
    namePlaceholder: hi ? 'जैसे: राम कुमार' : 'e.g. Ram Kumar',
    phoneLabel: hi ? 'मोबाइल नंबर' : 'Mobile number',
    phonePlaceholder: hi ? '10 अंकों का मोबाइल नंबर' : '10 digit mobile number',
    emailLabel: hi ? 'ईमेल (वैकल्पिक)' : 'Email (optional)',
    emailPlaceholder: hi ? 'अपना ईमेल दर्ज करें' : 'Enter your email address',
    villageLabel: hi ? 'गांव का नाम' : 'Village Name',
    villagePlaceholder: hi ? 'जैसे: रामपुर' : 'e.g. Rampur',
    districtLabel: hi ? 'जिला' : 'District',
    districtPlaceholder: hi ? 'जैसे: वाराणसी' : 'e.g. Varanasi',
    stateLabel: hi ? 'राज्य' : 'State',
    statePlaceholder: hi ? 'जैसे: उत्तर प्रदेश' : 'e.g. Uttar Pradesh',
    pincodeLabel: hi ? 'पिनकोड' : 'Pincode',
    pincodePlaceholder: hi ? '6 अंकों का पिनकोड' : '6 digit pincode',
    signupBtn: hi ? 'अकाउंट बनाएँ' : 'Create Account',
    signupSub: hi
      ? 'आप आगे OTP वेरिफिकेशन पूरा करेंगे'
      : 'You will verify with OTP in the next step',
    alreadyHave: hi ? 'पहले से अकाउंट है?' : 'Already have an account?',
    goToLogin: hi ? 'लॉगिन पर जाएँ' : 'Go to Login',
    termsLine: hi
      ? 'अकाउंट बनाते समय आप हमारे नियम व गोपनीयता नीति से सहमत हैं।'
      : 'By creating an account, you agree to our Terms & Privacy Policy.',
  };

  const appLogo = require('../../assets/images/Krishinex App logo PNG.png');

  const onToggleLanguage = () => {
    setLanguage(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  const handleSignup = async () => {
    // name — required, min 2 chars
    if (!name.trim() || name.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही नाम भरें (कम से कम 2 अक्षर)' : 'Please enter a valid name (at least 2 characters)');
      return;
    }
    // phone — exactly 10 digits
    const phoneClean = phone.trim().replace(/\D/g, '');
    if (!phoneClean || phoneClean.length !== 10) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    // email — optional, if filled validate format
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही ईमेल पता भरें' : 'Please enter a valid email address');
        return;
      }
    }
    // village — required, min 2 chars
    if (!village.trim() || village.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही गांव का नाम भरें' : 'Please enter a valid village name');
      return;
    }
    // district — required, min 2 chars
    if (!district.trim() || district.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही जिला भरें' : 'Please enter a valid district name');
      return;
    }
    // state — required, min 2 chars
    if (!state.trim() || state.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही राज्य भरें' : 'Please enter a valid state name');
      return;
    }
    // pincode — exactly 6 digits
    const pinClean = pincode.trim().replace(/\D/g, '');
    if (!pinClean || pinClean.length !== 6) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'पिनकोड 6 अंकों का होना चाहिए' : 'Pincode must be exactly 6 digits');
      return;
    }

    try {
      setLoading(true);

      const fullAddress = `${village.trim()}, ${district.trim()}, ${state.trim()} - ${pincode.trim()}`;

      const payload = {
        role: 'farmer',
        name,
        phone,
        email: email || '',
        address: fullAddress
      };

      const res = await authApi.register(payload);

      if (res.status === 201) {
        showAlert(
          hi ? 'सफलता' : 'Success',
          hi ? 'पंजीकरण सफल! अब आप लॉगिन कर सकते हैं।' : 'Registration successful! You can now login.'
        );
        router.replace('/(auth)/login' as any);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      const errMsg = error.response?.data?.error || (hi ? 'पंजीकरण विफल' : 'Registration failed');
      showAlert(hi ? 'त्रुटि' : 'Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.replace('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      <LinearGradient
        colors={['#5a8c15ff', '#b7f394ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <Image source={appLogo} style={styles.logoImg} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.appTitle}>KrishiNex</Text>
              <Text style={styles.appSubtitle}>{t.subtitle}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.langToggle}
            activeOpacity={0.85}
            onPress={onToggleLanguage}
          >
            <Ionicons
              name="globe-outline"
              size={16}
              color={KHETIFY_GREEN_DARK}
            />
            <Text style={styles.langText}>{hi ? 'EN' : 'हिंदी'}</Text>
          </TouchableOpacity>
        </View>

        {/* FORM CARD */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <View style={styles.secureRow}>
                  <Ionicons
                    name="leaf-outline"
                    size={13}
                    color={KHETIFY_GREEN_DARK}
                  />
                  <Text style={styles.secureText}>
                    {hi
                      ? 'आपकी बेसिक डिटेल्स से हम बेहतर सुझव दे पाएंगे'
                      : 'Your basic details help us serve you better'}
                  </Text>
                </View>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={KHETIFY_GREEN_DARK}
                />
              </View>
            </View>

            {/* NAME */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.nameLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* PHONE */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.phoneLabel}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Image
                    source={{ uri: 'https://flagcdn.com/w40/in.png' }}
                    style={styles.flagImg}
                  />
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>

                <View style={styles.phoneInputWrap}>
                  <TextInput
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder={t.phonePlaceholder}
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>
            </View>

            {/* EMAIL */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.emailLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* VILLAGE */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.villageLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="home-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.villagePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={village}
                  onChangeText={setVillage}
                />
              </View>
            </View>

            {/* DISTRICT */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.districtLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.districtPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
            </View>

            {/* STATE */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.stateLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="map-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t.statePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>

            {/* PINCODE */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>{t.pincodeLabel}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="pin-outline"
                  size={18}
                  color="#6B7280"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder={t.pincodePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>

            {/* SIGNUP BUTTON */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!name.trim() ||
                  !phone.trim() ||
                  !village.trim() ||
                  !district.trim() ||
                  !state.trim() ||
                  !pincode.trim()) && { opacity: 0.6 },
              ]}
              onPress={handleSignup}
              activeOpacity={0.9}
              disabled={
                !name.trim() ||
                !phone.trim() ||
                !village.trim() ||
                !district.trim() ||
                !state.trim() ||
                !pincode.trim() ||
                loading
              }
            >
              <LinearGradient
                colors={[KHETIFY_GREEN_DARK, KHETIFY_GREEN_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                <View>
                  <Text style={styles.primaryBtnText}>
                    {loading
                      ? hi
                        ? 'कृपया प्रतीक्षा करें...'
                        : 'Please wait...'
                      : t.signupBtn}
                  </Text>
                  <Text style={styles.primaryBtnSub}>{t.signupSub}</Text>
                </View>
                <Ionicons
                  name="arrow-forward-circle"
                  size={24}
                  color="#ecfdf5"
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* ALREADY HAVE ACCOUNT */}
            <View style={styles.loginRow}>
              <Text style={styles.alreadyText}>{t.alreadyHave}</Text>
              <TouchableOpacity onPress={goToLogin} activeOpacity={0.8}>
                <Text style={styles.loginLinkText}>{t.goToLogin}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.termsText}>{t.termsLine}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ========== STYLES ========== */

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginRight: 10,
  },
  logoImg: {
    width: '120%',
    height: '120%',
    resizeMode: 'cover',
  },
  headerTextWrap: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#022c22',
  },
  appSubtitle: {
    fontSize: 11,
    color: '#065f46',
    marginTop: 2,
  },

  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 7,
  },
  langText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },

  cardScrollContent: {
    paddingBottom: 24,
    paddingTop: 16,
  },

  card: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 7,
    borderWidth: 1,
    borderColor: '#e5f5dc',
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#022c22',
    marginBottom: 4,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fieldBlock: {
    marginTop: 14,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  // phone
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50, // Fixed height to match input
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  flagImg: {
    width: 18,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 50, // Fixed height to match country code
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  // Aadhaar doc
  docLabelRow: {
    marginBottom: 4,
  },
  docHintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: -2,
    marginBottom: 4,
  },
  docBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  docBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  docBtnSub: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 2,
  },

  primaryBtn: {
    marginTop: 20,
    borderRadius: 999,
    overflow: 'hidden',
  },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '900',
  },
  primaryBtnSub: {
    color: '#e5f5dc',
    fontSize: 11,
    marginTop: 2,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  alreadyText: {
    fontSize: 12,
    color: '#4b5563',
  },
  loginLinkText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },

  termsText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 10,
  },
});
