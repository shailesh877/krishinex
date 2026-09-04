// app/(auth)/login.tsx — KrishiNex Partner Login

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { useI18n } from '../../context/I18nContext';
import { API_URL, BASE_API_URL } from '../../constants/api';
import { registerTokenWithBackend } from '../../utils/notificationHelper';

const { height } = Dimensions.get('window');

type Role = 'buyer' | 'equipment' | 'soil' | 'shop' | 'labour' | 'employee' | 'field_executive';
type Lang = 'hi' | 'en';

const ROLES: { key: Role; labelHi: string; labelEn: string }[] = [
  {
    key: 'field_executive',
    labelHi: 'फील्ड एग्जीक्यूटिव',
    labelEn: 'Field Executive',
  },
  {
    key: 'buyer',
    labelHi: 'फसल खरीदार',
    labelEn: 'Crop Buyer',
  },
  {
    key: 'equipment',
    labelHi: 'किराया प्रदाता (ट्रैक्टर / मशीन)',
    labelEn: 'Rental Provider (Tractor / Machinery)',
  },
  {
    key: 'soil',
    labelHi: 'मिट्टी परीक्षण लैब',
    labelEn: 'Soil Testing Lab',
  },
  {
    key: 'shop',
    labelHi: 'दुकान भागीदार',
    labelEn: 'Shop Partner',
  },
  {
    key: 'labour',
    labelHi: 'लेबर पार्टनर',
    labelEn: 'Labour Partner',
  },
/*
  {
    key: 'employee',
    labelHi: 'कर्मचारी',
    labelEn: 'Employee',
  },
*/
];

const TEXTS: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    phoneLabel: string;
    otpLabel: string;
    verify: string;
    changeRole: string;
    placeholderPhone: string;
    placeholderOtp: string;
  }
> = {
  hi: {
    title: 'कृषि नेक्स पार्टनर',
    subtitle: 'कृपया अपना रोल चुनें',
    phoneLabel: 'मोबाइल नंबर',
    otpLabel: 'OTP',
    verify: 'लॉगिन करें',
    changeRole: 'रोल बदलें',
    placeholderPhone: '+91 9876543210',
    placeholderOtp: '1234',
  },
  en: {
    title: 'KrishiNex Partner',
    subtitle: 'Please select your role',
    phoneLabel: 'Mobile number',
    otpLabel: 'OTP',
    verify: 'Login',
    changeRole: 'Change role',
    placeholderPhone: '+91 9876543210',
    placeholderOtp: '1234',
  },
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // make sure useI18n returns lang: 'hi' | 'en'
  const { lang, toggleLang } = useI18n() as { lang: Lang; toggleLang: () => void };

  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'role-select' | 'phone-input' | 'otp'>('role-select');
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState('');

  // Backend URL matches signup
  // API_URL imported from constants/api

  const logoAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Initialize MSG91 Widget headless
    OTPWidget.initializeWidget("366361727571383132303632", "497379TbOp9la7qwjr69a483dbP1");

    Animated.spring(logoAnim, {
      toValue: 1,
      tension: 20,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [logoAnim]);

  const texts = TEXTS[lang];

  const handleSelectRole = (selected: Role) => {
    setRole(selected);
    if (selected === 'employee' || selected === 'field_executive') {
      setStep('otp'); // Employees use email/password directly
    } else {
      setStep('phone-input'); // Shows phone number field
    }
  };

  // Helper: wraps a promise with a timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}`)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  const handleSendOtp = async () => {
    if (!phone.trim() || phone.length < 10) {
      alert(lang === 'hi' ? 'सही मोबाइल नंबर डालें' : 'Enter valid mobile number');
      return;
    }

    // Google Play Store Dummy Account Bypass
    if (phone === '9519519519') {
      setStep('otp');
      return;
    }

    setLoading(true);
    try {
      // 1. Send OTP via Widget API (30s timeout — avoids infinite hang)
      const body = {
        identifier: phone.startsWith('91') ? phone : `91${phone}`
      };
      console.log('Sending Headless OTP:', body);
      const widgetRes = await withTimeout(OTPWidget.sendOTP(body), 30000);
      console.log('Widget Send Response:', widgetRes);

      // If success, store reqId from response
      if (widgetRes?.type === 'success' || widgetRes?.message?.includes('success') || widgetRes?.message === 'OTP sent successfully') {
        setReqId(widgetRes?.message || widgetRes?.reqId || widgetRes?.data?.reqId || '');
        setStep('otp');
      } else {
        // OTP send failed — show user-friendly message, do NOT proceed to OTP screen
        const rawMsg: string = widgetRes?.message || '';
        let friendlyMsg: string;

        if (rawMsg.toLowerCase().includes('ipblocked') || rawMsg.toLowerCase().includes('ip blocked')) {
          friendlyMsg = lang === 'hi'
            ? 'बहुत अधिक प्रयास हुए हैं। कुछ देर बाद दोबारा कोशिश करें।'
            : 'Too many attempts. Please try again after some time.';
        } else if (rawMsg.toLowerCase().includes('ratelimit') || rawMsg.toLowerCase().includes('rate limit') || rawMsg.toLowerCase().includes('too many')) {
          friendlyMsg = lang === 'hi'
            ? 'OTP सीमा पार हो गई। कुछ मिनट बाद कोशिश करें।'
            : 'OTP limit reached. Please try again in a few minutes.';
        } else if (rawMsg.toLowerCase().includes('invalid') || rawMsg.toLowerCase().includes('number')) {
          friendlyMsg = lang === 'hi'
            ? 'मोबाइल नंबर सही नहीं है। जाँच कर दोबारा कोशिश करें।'
            : 'Invalid mobile number. Please check and try again.';
        } else {
          friendlyMsg = lang === 'hi'
            ? 'OTP भेजने में समस्या आई। कृपया दोबारा कोशिश करें।'
            : 'Failed to send OTP. Please try again.';
        }

        alert(friendlyMsg);
        // Stay on phone-input step so user can retry
      }
    } catch (error: any) {
      console.error('Error sending Widget OTP:', error?.message || error);
      const isTimeout = error?.message?.startsWith('TIMEOUT_');
      const isNetwork = error?.message?.toLowerCase().includes('network') || error?.message?.toLowerCase().includes('fetch');

      let errMsg: string;
      if (isTimeout) {
        errMsg = lang === 'hi'
          ? 'OTP भेजने में बहुत समय लग रहा है। इंटरनेट जाँचें और दोबारा कोशिश करें।'
          : 'OTP request timed out. Please check your internet and try again.';
      } else if (isNetwork) {
        errMsg = lang === 'hi'
          ? 'इंटरनेट कनेक्शन नहीं है। जाँचें और दोबारा कोशिश करें।'
          : 'No internet connection. Please check and try again.';
      } else {
        errMsg = lang === 'hi'
          ? 'OTP सेवा में समस्या आई। कृपया दोबारा कोशिश करें।'
          : 'OTP service error. Please try again.';
      }
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };


  const handleVerify = async () => {
    setLoading(true);

    try {
      if (role === 'employee' || role === 'field_executive') {
        // ... (employee login logic unchanged)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch(`${API_URL}/login-employee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
          });
          clearTimeout(timeout);
          const empData = await response.json();
          if (response.ok && empData.token) {
            await AsyncStorage.setItem('userToken', empData.token);
            await AsyncStorage.setItem('userData', JSON.stringify(empData.user));
            
            // Sync push token
            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken) await registerTokenWithBackend(pushToken);

            router.replace('/(employee)/home');
          } else {
            alert(empData.error || 'Login failed');
          }
        } catch (e: any) {
          clearTimeout(timeout);
          alert(e?.name === 'AbortError' ? 'Server timeout. Check backend.' : `Error: ${e?.message}`);
        }
      } else {
        // Google Play Store Dummy Account Bypass
        if (phone === '9519519519') {
          if (otp !== '9519') {
            alert(lang === 'hi' ? 'गलत OTP' : 'Invalid OTP');
            setLoading(false);
            return;
          }
          // Proceed to backend directly
        } else {
          // ACTUAL verification via MSG91 Headless Widget
          try {
            const identifier = phone.startsWith('91') ? phone : `91${phone}`;
            console.log(`[AUTH] Verifying Headless OTP: Phone=${identifier} OTP=${otp} ReqId=${reqId}`);
            
            const verifyRes = await OTPWidget.verifyOTP({ identifier, otp, reqId });
            console.log('[AUTH] Widget Verify Response:', verifyRes);

            if (verifyRes.type !== 'success' && verifyRes.message !== 'OTP verified successfully') {
              alert(verifyRes.message || 'Invalid OTP. Please try again.');
              setLoading(false);
              return;
            }
          } catch (widgetError: any) {
            alert('Error validating OTP. Please try again.');
            setLoading(false);
            return;
          }
        }

        // OTP is verified (or bypassed), now proceed to get session from backend
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(`${API_URL}/login-partner-success`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, role }),
            signal: controller.signal
          });
          clearTimeout(timeout);

          const partnerData = await res.json().catch(() => ({}));
          console.log('Backend response:', partnerData);

          if (res.ok && partnerData.token) {
            await AsyncStorage.setItem('userToken', partnerData.token);
            await AsyncStorage.setItem('userData', JSON.stringify(partnerData.user));

            // Sync push token
            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken) await registerTokenWithBackend(pushToken);

            if (role === 'buyer') router.replace('/(buyer)/home');
            else if (role === 'equipment') router.replace('/(equipment)/home');
            else if (role === 'soil') router.replace('/(soil-lab)/home');
            else if (role === 'shop') router.replace('/(shop-partner)/home');
            else if (role === 'labour') router.replace('/(labour-partner)/home');
          } else {
            // Show Hindi error if available
            const errMsg = partnerData.errorHi || partnerData.error || 'Login failed. Please try again.';
            alert(errMsg);
          }
        } catch (serverError: any) {
          if (serverError?.name === 'AbortError') {
            alert('Server timeout. Please check your internet or try again later.');
          } else {
            alert(`Network Error: ${serverError?.message || 'Cannot reach server'}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Verify error:', error);
      alert('Error validating OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logoSource = require('../../assets/images/logo.png');

  return (
    <LinearGradient
      colors={['#5BBF3A', '#0E9F6E', '#1D4ED8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <Image
        source={logoSource}
        style={styles.bgLogo}
        resizeMode="contain"
        blurRadius={6}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" />

        {/* TOP BAR WITH TRANSLATE */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.translatePill} onPress={toggleLang}>
            <Text style={styles.translatePillText}>
              {lang === 'hi' ? '🇺🇸 English' : '🇮🇳 हिन्दी'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CENTER CARD */}
        <View style={styles.centerWrap}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: logoAnim,
                transform: [
                  {
                    translateY: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  {
                    scale: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* LOGO + TEXT */}
            <View style={styles.logoContainer}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              <Text style={styles.appTitle}>{texts.title}</Text>
              <Text style={styles.subtitle}>{texts.subtitle}</Text>
            </View>

            {/* STEP 1: ROLE SELECT */}
            {step === 'role-select' && (
              <ScrollView 
                style={styles.rolesScroll} 
                contentContainerStyle={styles.rolesContainer}
                showsVerticalScrollIndicator={false}
              >
                {ROLES.map(item => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.roleChip}
                    onPress={() => handleSelectRole(item.key)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.roleBullet} />
                    <Text style={styles.roleLabel}>
                      {lang === 'hi' ? item.labelHi : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* UNIFIED PHONE & OTP WIDGET HEADLESS (Only for partners) */}
            {(step === 'phone-input' || step === 'otp') && role && role !== 'employee' && role !== 'field_executive' && (
              <View style={styles.otpContainer}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi'
                    ? ROLES.find(r => r.key === role)?.labelHi
                    : ROLES.find(r => r.key === role)?.labelEn}{' '}
                  {lang === 'hi' ? 'लॉगिन' : 'login'}
                </Text>

                {step === 'phone-input' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{texts.phoneLabel}</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholder={texts.placeholderPhone}
                        placeholderTextColor="#9CA3AF"
                        value={phone}
                        onChangeText={setPhone}
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                      onPress={handleSendOtp}
                      disabled={loading}
                    >
                      <Text style={styles.primaryBtnText}>
                        {loading
                          ? (lang === 'hi' ? 'भेज रहा है...' : 'Sending...')
                          : (lang === 'hi' ? 'OTP भेजें' : 'Send OTP')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {step === 'otp' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{texts.otpLabel}</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        placeholder={texts.placeholderOtp}
                        placeholderTextColor="#9CA3AF"
                        value={otp}
                        onChangeText={setOtp}
                        maxLength={4}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                      onPress={handleVerify}
                      disabled={loading}
                    >
                      <Text style={styles.primaryBtnText}>
                        {loading
                          ? (lang === 'hi' ? 'प्रतीक्षा करें...' : 'Please wait...')
                          : (lang === 'hi' ? 'OTP वेरीफाई करें' : 'Verify OTP')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => {
                    router.push(`/(auth)/signup?role=${role || 'buyer'}` as any);
                  }}
                >
                  <Text style={styles.outlineBtnText}>{lang === 'hi' ? 'नया अकाउंट बनाएँ' : 'Create new account'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setRole(null);
                    setPhone('');
                    setOtp('');
                    setReqId('');
                    setLoading(false); // ← reset stuck loading state
                    setStep('role-select');
                  }}
                >
                  <Text style={styles.secondaryBtnText}>{texts.changeRole}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: EMPLOYEE LOGIN */}
            {step === 'otp' && (role === 'employee' || role === 'field_executive') && (
              <View style={styles.otpContainer}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi'
                    ? ROLES.find(r => r.key === role)?.labelHi
                    : ROLES.find(r => r.key === role)?.labelEn}{' '}
                  {lang === 'hi' ? 'लॉगिन' : 'login'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'ईमेल / यूज़रनेम' : 'Email / Username'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      lang === 'hi'
                        ? 'employee@company.com'
                        : 'employee@company.com'
                    }
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'पासवर्ड' : 'Password'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'hi' ? '********' : '********'}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? (lang === 'hi' ? 'प्रतीक्षा करें...' : 'Please wait...') : texts.verify}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setRole(null);
                    setPhone('');
                    setOtp('');
                    setEmail('');
                    setPassword('');
                    setStep('role-select');
                  }}
                >
                  <Text style={styles.secondaryBtnText}>{texts.changeRole}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bgLogo: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.06,
    alignSelf: 'center',
    top: height * 0.12,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  translatePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    width: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  translatePillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  centerWrap: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 160,
    height: 56,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  rolesScroll: { maxHeight: height * 0.45 },
  rolesContainer: { paddingVertical: 8, gap: 10 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  roleBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 10,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  otpContainer: { marginTop: 8 },
  roleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 14 },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneInputFlexible: {
    flex: 1,
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryBtn: {
    backgroundColor: '#0EA76A',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: { marginTop: 12, alignItems: 'center' },
  secondaryBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  inlineBtn: {
    backgroundColor: '#0EA76A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
    flexShrink: 0,
  },
  inlineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#0EA76A',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  outlineBtnText: {
    color: '#0EA76A',
    fontSize: 16,
    fontWeight: '700',
  },
});

