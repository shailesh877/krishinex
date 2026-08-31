// app/(auth)/login.tsx

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
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { authApi } from '../../services/api';
import { registerTokenWithBackend } from '../../utils/notificationHelper';

const KHETIFY_GREEN_DARK = '#4b7d0a';
const KHETIFY_GREEN_LIGHT = '#a3d546';
const SHADOW_COLOR = '#00000020';

const withTimeout = <T,>(promise: Promise<T>, ms: number) => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`TIMEOUT_${ms}`)), ms)
  );
  return Promise.race([promise, timeout]);
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState('');

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const hi = language === 'hi';

  const t = {
    subtitle: hi
      ? 'आपके खेत के लिए डिजिटल साथी'
      : 'Your digital partner for farming',
    loginTitle:
      step === 'PHONE'
        ? hi
          ? 'मोबाइल नंबर से लॉगिन'
          : 'Login with mobile number'
        : hi
          ? 'OTP वेरिफिकेशन'
          : 'OTP Verification',
    phoneLabel: hi ? 'मोबाइल नंबर' : 'Mobile number',
    phonePlaceholder: hi ? 'अपना नंबर दर्ज करें' : 'Enter your number',
    sendOtp: hi ? 'OTP भेजें' : 'Send OTP',
    otpLabel: hi ? 'OTP दर्ज करें' : 'Enter OTP',
    otpPlaceholder: hi ? '••••' : '••••',
    verifyOtp: hi ? 'वेरिफाई कर के आगे बढ़ें' : 'Verify & Continue',
    changeNumber: hi ? 'नंबर बदलें' : 'Change number',
    or: hi ? 'या' : 'or',
    newFarmerTitle: hi ? 'नए किसान हैं?' : 'New to KrishiNex?',
    newFarmerCta: hi ? 'नया अकाउंट बनाएँ' : 'Create new account',
    termsLine: hi
      ? 'आगे बढ़ते ही आप हमारे नियम व गोपनीयता नीति से सहमत हैं।'
      : 'By continuing, you agree to our Terms & Privacy Policy.',
  };

  // simple single logo (no language switch)
  const appLogo = require('../../assets/images/Krishinex App logo PNG.png');

  const onToggleLanguage = () => {
    setLanguage(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  React.useEffect(() => {
    // Initialize MSG91 Widget headless
    OTPWidget.initializeWidget("366361727571383132303632", "497379TbOp9la7qwjr69a483dbP1");
  }, []);

  const handleSendOtp = async () => {
    // Strip everything except digits
    const cleanPhone = phone.replace(/\D/g, '');
    let finalPhone = cleanPhone;

    // Remove 91 or 0 prefix if present to standardize to 10 digits
    if (finalPhone.startsWith('91') && finalPhone.length === 12) {
      finalPhone = finalPhone.substring(2);
    } else if (finalPhone.startsWith('0') && finalPhone.length === 11) {
      finalPhone = finalPhone.substring(1);
    }

    if (finalPhone.length < 10) return;
    
    // Update the state so the UI reflects the clean number
    setPhone(finalPhone);

    // Google Play Store Dummy Account Bypass
    if (finalPhone === '9519519519') {
      setStep('OTP');
      return;
    }

    try {
      setLoading(true);
      // Send OTP via Widget API
      const body = {
        identifier: `91${finalPhone}`
      };
      console.log('Sending Headless OTP:', body);
      const widgetRes = await withTimeout(OTPWidget.sendOTP(body), 60000);

      if (widgetRes?.type === 'success' || widgetRes?.message?.includes('success') || widgetRes?.message === 'OTP sent successfully') {
        // Handle MSG91's strange response structures
        let parsedReqId = '';
        if (widgetRes.reqId) parsedReqId = widgetRes.reqId;
        else if (widgetRes.data && widgetRes.data.reqId) parsedReqId = widgetRes.data.reqId;
        else if (widgetRes.message && widgetRes.message.length > 20 && !widgetRes.message.includes(' ')) parsedReqId = widgetRes.message; // often message IS the reqId

        setReqId(parsedReqId || widgetRes?.message || '');
        setStep('OTP');
      } else {
        let msg = widgetRes?.message || 'Failed to send OTP via Widget';
        if (msg.toLowerCase().includes('ipbloack') || msg.toLowerCase().includes('ipblock') || msg.toLowerCase().includes('blocked')) {
          msg = hi 
            ? 'सुरक्षा कारणों से कुछ समय के लिए अनुरोध रोक दिया गया है। कृपया थोड़ी देर बाद प्रयास करें।' 
            : 'Too many requests. Please try again after some time.';
        }
        showAlert(hi ? 'त्रुटि' : 'Error', msg);
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      let errMsg = hi ? 'OTP भेजने में विफल। कृपया पुन: प्रयास करें।' : 'Failed to send OTP. Please try again.';
      if (error?.message?.includes('TIMEOUT')) {
        errMsg = hi ? 'नेटवर्क धीमा होने के कारण OTP भेजने में समय लग रहा है। कृपया कुछ देर प्रतीक्षा करें या नेटवर्क क्षेत्र में आकर पुनः प्रयास करें।' : 'Network is slow. OTP delivery is taking longer than expected. Please check your connection and try again.';
      }
      showAlert(
        hi ? 'त्रुटि' : 'Error',
        errMsg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;

    // Google Play Store Dummy Account Bypass
    if (phone === '9519519519') {
      try {
        setLoading(true);
        // Call backend with dummy OTP
        const res = await authApi.verifyOtp(phone, otp);
        if (res.data.verified) {
          if (res.data.exists) {
            await AsyncStorage.setItem('userToken', res.data.token);
            await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
            // Register push token after login (race condition fix)
            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken) registerTokenWithBackend(pushToken).catch(() => {});
            router.replace('/(tabs)' as any);
          } else {
            showAlert(hi ? 'पंजीकरण आवश्यक' : 'Registration Required', hi ? 'कृपया रजिस्टर करें।' : 'Please register.');
          }
        } else {
          showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'गलत OTP' : 'Invalid OTP');
        }
      } catch (error: any) {
        showAlert(hi ? 'त्रुटि' : 'Error', 'Login failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // Verify OTP via Widget
      const body = {
        reqId: reqId,
        otp: otp
      };

      const widgetRes = await withTimeout(OTPWidget.verifyOTP(body), 60000);

      // We bypass the backend verification by sending the mock '123456' which the backend is currently configured to accept, 
      // OR we just use the real verify if it's disabled. 
      // Since backend has MSG91 disabled, ANY request to our backend with OTP='123456' will be accepted.
      // This is a bridge between the frontend widget passing and our backend getting the user data.
      if (widgetRes?.type === 'success' || widgetRes?.message === 'OTP verified successfully') {
        // Widget verified successfully! Now authenticate with our backend.
        // We send widget_verified=true so the backend trusts the widget verification
        // and doesn't try to re-verify the OTP against MSG91 (which would fail with 401).
        const res = await authApi.verifyOtp(phone, '', 'farmer', true);

        if (res.data.verified) {
          if (res.data.exists) {
            // User exists, save token and go to tabs
            await AsyncStorage.setItem('userToken', res.data.token);
            await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
            // Register push token after login (race condition fix)
            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken) registerTokenWithBackend(pushToken).catch(() => {});
            router.replace('/(tabs)' as any);
          } else {
            // User doesn't exist, go to signup
            showAlert(
              hi ? 'पंजीकरण आवश्यक' : 'Registration Required',
              hi ? 'कृपया अपना अकाउंट बनाने के लिए रजिस्टर करें।' : 'Please register to create your account.'
            );
            router.push({
              pathname: '/(auth)/signup' as any,
              params: { phone }
            });
          }
        }
      } else {
        throw new Error('Invalid OTP from Widget');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      let errMsg = hi ? 'गलत OTP। कृपया पुन: प्रयास करें।' : 'Invalid OTP. Please try again.';
      if (error?.message?.includes('TIMEOUT')) {
        errMsg = hi ? 'नेटवर्क धीमा होने के कारण OTP भेजने में समय लग रहा है। कृपया कुछ देर प्रतीक्षा करें या नेटवर्क क्षेत्र में आकर पुनः प्रयास करें।' : 'Network is slow. OTP delivery is taking longer than expected. Please check your connection and try again.';
      }
      showAlert(
        hi ? 'त्रुटि' : 'Error',
        errMsg
      );
    } finally {
      setLoading(false);
    }
  };

  const onNewFarmer = () => {
    router.push('/(auth)/signup' as any);
  };

  const fullPhoneDisplay =
    '+91 ' + (phone.trim() || (hi ? 'XXXXXXXXXX' : 'XXXXXXXXXX'));

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

        {/* LOGIN / OTP CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>{t.loginTitle}</Text>
              <View style={styles.secureRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color={KHETIFY_GREEN_DARK}
                />
                <Text style={styles.secureText}>
                  {step === 'PHONE'
                    ? hi
                      ? 'सुरक्षित OTP आधारित लॉगिन'
                      : 'Secure OTP based sign in'
                    : hi
                      ? 'हमने आपके नंबर पर 4 अंकों का OTP भेजा है'
                      : 'We have sent a 4-digit OTP to your number'}
                </Text>
              </View>
            </View>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === 'PHONE' ? 'phone-portrait-outline' : 'keypad-outline'}
                size={20}
                color={KHETIFY_GREEN_DARK}
              />
            </View>
          </View>

          {/* PHONE STEP */}
          {step === 'PHONE' && (
            <>
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
{/* <TouchableOpacity activeOpacity={0.8}>
                    <Ionicons name="mic-outline" size={18} color="#6B7280" />
                  </TouchableOpacity> */}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !phone.trim() && { opacity: 0.6 },
                ]}
                onPress={handleSendOtp}
                activeOpacity={0.9}
                disabled={!phone.trim() || loading}
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
                        : t.sendOtp}
                    </Text>
                    <Text style={styles.primaryBtnSub}>
                      {hi
                        ? 'OTP SMS के ज़रिए तेज़ और सुरक्षित लॉगिन'
                        : 'Fast & secure login via OTP SMS'}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={24}
                    color="#ecfdf5"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* OTP STEP */}
          {step === 'OTP' && (
            <>
              <Text style={styles.inputLabel}>{t.otpLabel}</Text>

              <Text style={styles.subTitle}>
                {hi ? 'SMS भेजा गया:' : 'OTP sent to:'}{' '}
                <Text style={styles.phoneHighlight}>{fullPhoneDisplay}</Text>
              </Text>

              <View style={styles.otpBox}>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t.otpPlaceholder}
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color="#6b7280"
                />
                <Text style={styles.infoText}>
                  {hi
                    ? 'आपका मोबाइल नंबर सिर्फ अकाउंट सुरक्षा के लिए उपयोग होगा।'
                    : 'Your mobile number is used only to secure your account.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !otp.trim() && { opacity: 0.6 },
                ]}
                onPress={handleVerifyOtp}
                activeOpacity={0.9}
                disabled={!otp.trim() || loading}
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
                        : t.verifyOtp}
                    </Text>
                  </View>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color="#ecfdf5"
                  />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeNumberBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setStep('PHONE');
                  setOtp('');
                }}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={16}
                  color="#4b5563"
                />
                <Text style={styles.changeNumberText}>{t.changeNumber}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* DIVIDER */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>{t.or}</Text>
            <View style={styles.orLine} />
          </View>

          {/* NEW FARMER CTA */}
          <Text style={styles.newFarmerTitle}>{t.newFarmerTitle}</Text>

          <TouchableOpacity
            style={styles.newFarmerBtn}
            activeOpacity={0.9}
            onPress={onNewFarmer}
          >
            <View style={styles.newFarmerLeft}>
              <View style={styles.avatarCircle}>
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={KHETIFY_GREEN_DARK}
                />
              </View>
              <View>
                <Text style={styles.newFarmerText}>{t.newFarmerCta}</Text>
                <Text style={styles.newFarmerSub}>
                  {hi
                    ? 'कुछ ही स्टेप में अपनी ज़मीन रजिस्टर करें'
                    : 'Register your farm in a few steps'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4b5563" />
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>{t.termsLine}</Text>
      </View>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconWrap}>
              <Ionicons name={alertTitle === 'Error' || alertTitle === 'त्रुटि' ? "alert-circle" : "information-circle"} size={32} color={alertTitle === 'Error' || alertTitle === 'त्रुटि' ? "#EF4444" : KHETIFY_GREEN_DARK} />
            </View>
            <Text style={styles.alertTitleText}>{alertTitle}</Text>
            <Text style={styles.alertMessageText}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertBtnText}>{hi ? 'ठीक है' : 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 14,
    justifyContent: 'space-between',
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
  },
  logoImg: {
    width: '120%',
    height: '120%',
    resizeMode: 'cover',
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

  card: {
    marginTop: 28,
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

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },

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
    marginRight: 6,
  },

  otpBox: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 12,
    textAlign: 'center',
    color: '#111827',
  },

  subTitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#111827',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },

  primaryBtn: {
    marginTop: 18,
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

  changeNumberBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeNumberText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },

  newFarmerTitle: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 6,
  },

  newFarmerBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
  },
  newFarmerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  newFarmerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  newFarmerSub: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 1,
  },

  termsText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Custom Alert Styles
  alertBackdrop: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  alertIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessageText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertBtn: {
    backgroundColor: KHETIFY_GREEN_DARK,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  alertBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
