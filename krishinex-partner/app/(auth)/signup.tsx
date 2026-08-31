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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useI18n } from '../../context/I18nContext';
import { API_URL } from '../../constants/api';
import * as Location from 'expo-location';
import { showAlert } from '../../components/CustomAlert';

type Role = 'buyer' | 'equipment' | 'soil' | 'shop' | 'labour';
type AadhaarDoc = DocumentPicker.DocumentPickerAsset | null;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();

  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as Role) || 'buyer';

  const hi = lang === 'hi';

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  const roleLabel = (() => {
    if (role === 'soil') {
      return hi ? 'लैब का नाम' : 'Lab name';
    }
    if (role === 'shop') {
      return hi ? 'दुकान का नाम' : 'Shop name';
    }
    return hi
      ? 'व्यवसाय / फर्म का नाम (वैकल्पिक)'
      : 'Business / Firm name (optional)';
  })();

  const headerTitle = (() => {
    if (role === 'buyer') return hi ? 'फसल खरीदार साइनअप' : 'Crop Buyer Signup';
    if (role === 'equipment')
      return hi ? 'किराया प्रदाता साइनअप' : 'Rental Provider Signup';
    if (role === 'soil')
      return hi ? 'मिट्टी लैब साइनअप' : 'Soil Lab Signup';
    if (role === 'shop')
      return hi ? 'दुकान पार्टनर साइनअप' : 'Shop Partner Signup';
    if (role === 'labour')
      return hi ? 'लेबर पार्टनर साइनअप' : 'Labour Partner Signup';
    return hi ? 'नया अकाउंट बनाएँ' : 'Create account';
  })();

  const texts = {
    nameLabel: hi ? 'पूरा नाम' : 'Full name',
    namePlaceholder: hi ? 'जैसे: राम कुमार' : 'e.g. Ram Kumar',
    emailLabel: hi ? 'ईमेल (वैकल्पिक)' : 'Email (optional)',
    emailPlaceholder: hi ? 'example@domain.com' : 'example@domain.com',
    phoneLabel: hi ? 'मोबाइल नंबर' : 'Mobile number',
    phonePlaceholder: hi ? '10 अंकों का मोबाइल नंबर' : '10 digit mobile number',
    villageLabel: hi ? 'गांव का नाम' : 'Village name',
    villagePlaceholder: hi ? 'गांव का नाम दर्ज करें' : 'Enter village name',
    districtLabel: hi ? 'जिला' : 'District',
    districtPlaceholder: hi ? 'जिले का नाम दर्ज करें' : 'Enter district name',
    stateLabel: hi ? 'राज्य' : 'State',
    statePlaceholder: hi ? 'राज्य का नाम दर्ज करें' : 'Enter state name',
    pincodeLabel: hi ? 'पिनकोड' : 'Pincode',
    pincodePlaceholder: hi ? '6 अंकों का पिनकोड' : '6 digit pincode',
    submit: hi ? 'अकाउंट बनाएँ' : 'Create account',
    submitSub: hi
      ? 'अगले स्टेप में OTP वेरिफिकेशन होगा'
      : 'You will verify with OTP in the next step',
    backToLogin: hi ? 'लॉगिन स्क्रीन पर जाएँ' : 'Back to login',
  };

  const logo = require('../../assets/images/logo.png');



  const handleSubmit = async () => {
    // Required fields
    if (!name.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया पूरा नाम भरें' : 'Please enter your full name');
      return;
    }
    if (name.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
      return;
    }

    // businessName required for soil/shop roles
    if ((role === 'soil' || role === 'shop') && !businessName.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error',
        role === 'soil'
          ? (hi ? 'कृपया लैब का नाम भरें' : 'Please enter lab name')
          : (hi ? 'कृपया दुकान का नाम भरें' : 'Please enter shop name')
      );
      return;
    }

    // Email — optional but validate format if filled
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही ईमेल पता भरें' : 'Please enter a valid email address');
        return;
      }
    }

    // Phone — exactly 10 digits
    const phoneClean = phone.trim().replace(/\D/g, '');
    if (!phoneClean || phoneClean.length !== 10) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया 10 अंकों का मोबाइल नंबर भरें' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (!village.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया गांव का नाम भरें' : 'Please enter village name');
      return;
    }
    if (!district.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया जिले का नाम भरें' : 'Please enter district name');
      return;
    }
    if (!state.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया राज्य का नाम भरें' : 'Please enter state name');
      return;
    }

    // Pincode — exactly 6 digits
    const pincodeClean = pincode.trim().replace(/\D/g, '');
    if (!pincodeClean || pincodeClean.length !== 6) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया 6 अंकों का पिनकोड भरें' : 'Please enter a valid 6-digit pincode');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('role', role);
      formData.append('name', name);
      formData.append('businessName', businessName);
      formData.append('email', email);
      formData.append('phone', phone);
      
      const fullAddress = `${village.trim()}, ${district.trim()}, ${state.trim()} - ${pincode.trim()}`;
      formData.append('address', fullAddress);

      // Get location coordinates (max 5 seconds, don't block signup)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Location timeout')), 5000)
            ),
          ]) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
          formData.append('lat', loc.coords.latitude.toString());
          formData.append('lng', loc.coords.longitude.toString());
        }
      } catch (locErr) {
        console.warn('Location fetch failed:', locErr);
        // Continue signup without location if it fails
      }

      // Use production API URL defined in constants
      const REGISTER_URL = `${API_URL}/register`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

      const response = await fetch(REGISTER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        showAlert(
          hi ? 'सफलता' : 'Success',
          hi ? 'आपका अकाउंट बन गया है!' : 'Account created successfully!'
        );
        router.replace('/');
      } else {
        showAlert(hi ? 'त्रुटि' : 'Error', data.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error?.name === 'AbortError') {
        showAlert(
          hi ? 'त्रुटि' : 'Error',
          hi ? 'सर्वर से कनेक्ट होने में समस्या आई (Timeout)' : 'Could not connect to server (Timeout)'
        );
      } else {
        showAlert(
          hi ? 'त्रुटि' : 'Error',
          hi ? 'सर्वर से कनेक्ट होने में समस्या आई' : 'Could not connect to server'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    router.replace('/');
  };

  const businessPlaceholder = (() => {
    if (role === 'soil')
      return hi ? 'जैसे: Green Soil Test Lab' : 'e.g. Green Soil Test Lab';
    if (role === 'shop')
      return hi ? 'जैसे: कृषक कृषि केंद्र' : 'e.g. Krishak Agro Center';
    if (role === 'equipment')
      return hi ? 'जैसे: शर्मा ट्रैक्टर सर्विस' : 'e.g. Sharma Tractor Service';
    if (role === 'labour')
      return hi ? 'जैसे: मजदूर समूह का नाम' : 'e.g. Labour group name';
    return hi ? 'यदि कोई फर्म/कंपनी है तो' : 'If you have a firm/company';
  })();

  return (
    <LinearGradient
      colors={['#0EA76A', '#047857', '#1D4ED8']} // emerald → dark green → indigo [web:126][web:132]
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" />

        <Image
          source={logo}
          style={styles.bgLogo}
          resizeMode="contain"
          blurRadius={6}
        />

        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.logoWrap}>
              <Image source={logo} style={styles.logoImg} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <Text style={styles.headerSub}>
                {hi
                  ? 'ज़्यादा जानकारी देने से हम आपको बेहतर सेवा दे सकते हैं'
                  : 'More details help us serve you better'}
              </Text>
            </View>
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.nameLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.namePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Role-specific name */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{roleLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={businessPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>

              {/* Email */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.emailLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.emailPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Phone */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.phoneLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.phonePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Village */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.villageLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.villagePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={village}
                  onChangeText={setVillage}
                />
              </View>

              {/* District */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.districtLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.districtPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>

              {/* State */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.stateLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.statePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={state}
                  onChangeText={setState}
                />
              </View>

              {/* Pincode */}
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{texts.pincodeLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.pincodePlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {/* SUBMIT */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!name.trim() ||
                    !phone.trim() ||
                    !village.trim() ||
                    !district.trim() ||
                    !state.trim() ||
                    !pincode.trim()) && { opacity: 0.6 },
                ]}
                activeOpacity={0.9}
                onPress={handleSubmit}
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
                  colors={['#22C55E', '#16A34A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGrad}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.submitText}>
                      {loading
                        ? hi
                          ? 'कृपया प्रतीक्षा करें...'
                          : 'Please wait...'
                        : texts.submit}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to login */}
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.8}
                onPress={goBackToLogin}
              >
                <Text style={styles.backText}>{texts.backToLogin}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  root: { flex: 1 },
  bgLogo: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.06,
    alignSelf: 'center',
    top: 80,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ECFDF5',
  },
  headerSub: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 10,
  },
  formContent: {
    paddingBottom: 26,
  },
  fieldBlock: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  docLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  docHint: {
    fontSize: 10,
    color: '#6B7280',
  },
  docBtn: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  docSub: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 2,
    maxWidth: 220,
  },
  docUploadIcon: {
    fontSize: 18,
  },
  submitBtn: {
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  submitGrad: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '900',
  },
  submitSub: {
    color: '#DCFCE7',
    fontSize: 11,
    marginTop: 2,
  },
  backBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  backText: {
    fontSize: 12,
    color: '#4B5563', // darker gray for better visibility
    fontWeight: '600',
  },
});

