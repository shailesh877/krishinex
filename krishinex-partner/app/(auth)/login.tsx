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
import { useUser } from '../../context/UserContext';
import { API_URL, BASE_API_URL, MSG91_WIDGET_ID, MSG91_AUTH_KEY } from '../../constants/api';
import { registerTokenWithBackend } from '../../utils/notificationHelper';
import { showAlert } from '../../components/CustomAlert';

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
  const { updateUser } = useUser();
  // make sure useI18n returns lang: 'hi' | 'en'
  const { lang, toggleLang } = useI18n() as { lang: Lang; toggleLang: () => void };

  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<
    'role-select' | 'phone-input' | 'otp' | 'fe-forgot-enter' | 'fe-forgot-otp' | 'fe-forgot-new-pwd'
  >('role-select');
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState('');

  // Field Executive Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState('');
  const [forgotMode, setForgotMode] = useState<'email' | 'phone'>('phone');
  const [forgotMaskedTarget, setForgotMaskedTarget] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotReqId, setForgotReqId] = useState('');

  // Backend URL matches signup
  // API_URL imported from constants/api

  const logoAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Initialize MSG91 Widget headless
    OTPWidget.initializeWidget(
      MSG91_WIDGET_ID,
      MSG91_AUTH_KEY
    );

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
      showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'सही मोबाइल नंबर डालें' : 'Enter valid mobile number');
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

        showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', friendlyMsg);
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
      showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', errMsg);
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
        const timeout = setTimeout(() => controller.abort(), 25000);
        try {
          const response = await fetch(`${API_URL}/login-employee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role }),
            signal: controller.signal
          });
          clearTimeout(timeout);
          const empData = await response.json();
          if (response.ok && empData.token) {
            await AsyncStorage.setItem('userToken', empData.token);
            await AsyncStorage.setItem('userData', JSON.stringify(empData.user));
            if (updateUser) updateUser(empData.user);
            
            // Sync push token
            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken) await registerTokenWithBackend(pushToken);

            router.replace('/(employee)/home');
          } else {
            const fallbackMsg = role === 'field_executive'
              ? (lang === 'hi' ? 'अकाउंट नहीं मिला, कृपया एडमिनिस्ट्रेशन से संपर्क करें।' : 'Account not found. Please connect to administration.')
              : (lang === 'hi' ? 'अकाउंट नहीं मिला, पहले अकाउंट बनाएं' : 'Account not found. Please create an account first.');
            const errMsg = (lang === 'hi' ? empData.errorHi : empData.error) || empData.error || empData.errorHi || empData.message || fallbackMsg;
            showAlert(lang === 'hi' ? 'सूचना' : 'Notice', errMsg);
          }
        } catch (e: any) {
          clearTimeout(timeout);
          showAlert(
            lang === 'hi' ? 'त्रुटि' : 'Error',
            lang === 'hi'
              ? 'लॉगिन करने में असमर्थ। कृपया नेटवर्क जाँचें या कुछ देर बाद पुनः प्रयास करें।'
              : 'Unable to login. Please check your network or try again shortly.'
          );
        }
      } else {
        // Google Play Store Dummy Account Bypass
        if (phone === '9519519519') {
          if (otp !== '9519') {
            showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'गलत OTP' : 'Invalid OTP');
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
              showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', verifyRes.message || 'Invalid OTP. Please try again.');
              setLoading(false);
              return;
            }
          } catch (widgetError: any) {
            showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', 'Error validating OTP. Please try again.');
            setLoading(false);
            return;
          }
        }

        // OTP is verified (or bypassed), now proceed to get session from backend
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
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
            const fallbackMsg = lang === 'hi' ? 'अकाउंट नहीं मिला, पहले अकाउंट बनाएं' : 'Account not found. Please create an account first.';
            const errMsg = (lang === 'hi' ? partnerData.errorHi : partnerData.error) || partnerData.error || partnerData.errorHi || partnerData.message || fallbackMsg;
            showAlert(lang === 'hi' ? 'सूचना' : 'Notice', errMsg);
          }
        } catch (serverError: any) {
          clearTimeout(timeout);
          showAlert(
            lang === 'hi' ? 'त्रुटि' : 'Error',
            lang === 'hi'
              ? 'लॉगिन करने में असमर्थ। कृपया नेटवर्क जाँचें या कुछ समय बाद पुनः प्रयास करें।'
              : 'Unable to login. Please check your network or try again shortly.'
          );
        }
      }
    } catch (error: any) {
      console.error('Verify error:', error);
      showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', 'Error validating OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- FIELD EXECUTIVE FORGOT PASSWORD HANDLERS ---
  const handleFeForgotInit = async () => {
    const ident = forgotIdentifier.trim();
    if (!ident) {
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi'
          ? 'कृपया अपना रजिस्टर्ड मोबाइल नंबर या ईमेल दर्ज करें।'
          : 'Please enter your registered mobile number or email.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/field-executive/forgot-password/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        data = {};
      }

      if (!res.ok || !data.success) {
        const errMsg = (lang === 'hi' ? data.errorHi : data.error) || data.error || (
          res.status === 404
            ? (lang === 'hi'
                ? 'अकाउंट नहीं मिला, कृपया एडमिनिस्ट्रेशन से संपर्क करें।'
                : 'Account not found. Please connect to administration.')
            : (lang === 'hi'
                ? 'सर्वर से जवाब नहीं मिला। कृपया थोड़ी देर बाद प्रयास करें।'
                : 'Unable to reach server. Please try again in a moment.')
        );
        showAlert(lang === 'hi' ? 'सूचना' : 'Notice', errMsg);
        return;
      }

      const mode = data.mode || (ident.includes('@') ? 'email' : 'phone');
      setForgotMode(mode);
      setForgotPhone(data.phone || '');
      setForgotMaskedPhone(data.maskedPhone || data.phone || '');
      const targetDisplay = data.maskedTarget || (mode === 'email' ? (data.email || ident) : (data.maskedPhone || data.phone));
      setForgotMaskedTarget(targetDisplay);

      if (mode === 'email') {
        // Backend has directly dispatched OTP via SMTP to email
        setForgotOtp('');
        setStep('fe-forgot-otp');
        showAlert(
          lang === 'hi' ? 'सफल' : 'Success',
          lang === 'hi'
            ? `OTP आपके ईमेल (${data.email || ident}) पर भेज दिया गया है।`
            : `OTP has been sent to your email (${data.email || ident}).`
        );
        return;
      }

      // Phone mode: send SMS OTP via MSG91 Headless Widget
      if (data.phone === '9519519519') {
        setForgotOtp('');
        setStep('fe-forgot-otp');
        return;
      }

      const body = {
        identifier: data.phone.startsWith('91') ? data.phone : `91${data.phone}`
      };
      console.log('[AUTH] Sending FE Forgot Password SMS OTP to:', body);
      const widgetRes = await withTimeout(OTPWidget.sendOTP(body), 30000);
      console.log('[AUTH] Widget Response:', widgetRes);

      if (widgetRes?.type === 'success' || widgetRes?.message?.includes('success') || widgetRes?.message === 'OTP sent successfully') {
        setForgotReqId(widgetRes?.message || widgetRes?.reqId || widgetRes?.data?.reqId || '');
        setForgotOtp('');
        setStep('fe-forgot-otp');
      } else {
        showAlert(
          lang === 'hi' ? 'सूचना' : 'Notice',
          lang === 'hi'
            ? 'OTP भेजने में समस्या आई। कृपया दोबारा प्रयास करें।'
            : 'Failed to send OTP. Please try again.'
        );
      }
    } catch (err: any) {
      console.error('Forgot password init error:', err);
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi'
          ? 'OTP भेजने में समस्या आई। कृपया इंटरनेट जाँचें और पुनः प्रयास करें।'
          : 'Failed to send OTP. Please check your internet and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeForgotVerifyOtp = async () => {
    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi' ? 'कृपया 4 अंकों का OTP दर्ज करें।' : 'Please enter 4-digit OTP.'
      );
      return;
    }

    setLoading(true);
    try {
      if (forgotMode === 'email') {
        // Verify Email OTP against backend
        const res = await fetch(`${API_URL}/field-executive/forgot-password/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: forgotIdentifier,
            email: forgotIdentifier,
            otp: cleanOtp,
            mode: 'email'
          }),
        });
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch (e) { data = {}; }

        if (!res.ok || !data.success) {
          const errMsg = (lang === 'hi' ? data.errorHi : data.error) || data.error || (
            lang === 'hi' ? 'गलत या समाप्त OTP। कृपया पुनः प्रयास करें।' : 'Invalid or expired OTP. Please try again.'
          );
          showAlert(lang === 'hi' ? 'सूचना' : 'Notice', errMsg);
          return;
        }

        setStep('fe-forgot-new-pwd');
        return;
      }

      // Phone SMS mode verification
      if (forgotPhone === '9519519519') {
        if (cleanOtp !== '9519') {
          showAlert(lang === 'hi' ? 'सूचना' : 'Notice', lang === 'hi' ? 'गलत OTP' : 'Invalid OTP');
          return;
        }
        setStep('fe-forgot-new-pwd');
        return;
      }

      const identifier = forgotPhone.startsWith('91') ? forgotPhone : `91${forgotPhone}`;
      console.log(`[AUTH] Verifying FE Forgot OTP: Phone=${identifier} OTP=${cleanOtp}`);
      const verifyRes = await withTimeout(OTPWidget.verifyOTP({ identifier, otp: cleanOtp, reqId: forgotReqId }), 30000);
      console.log('[AUTH] Widget Verify Response:', verifyRes);

      if (verifyRes.type !== 'success' && verifyRes.message !== 'OTP verified successfully') {
        showAlert(lang === 'hi' ? 'सूचना' : 'Notice', verifyRes.message || (lang === 'hi' ? 'गलत OTP' : 'Invalid OTP'));
        return;
      }

      setStep('fe-forgot-new-pwd');
    } catch (err: any) {
      console.error('Forgot verify OTP error:', err);
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi' ? 'OTP सत्यापन विफल रहा। कृपया पुनः प्रयास करें।' : 'OTP verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeForgotResetPassword = async () => {
    if (!forgotNewPassword.trim() || forgotNewPassword.length < 4) {
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : 'Password must be at least 4 characters long.'
      );
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi' ? 'दोनों पासवर्ड मेल नहीं खाते हैं।' : 'Passwords do not match.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/field-executive/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          phone: forgotPhone,
          email: forgotIdentifier,
          mode: forgotMode,
          otp: forgotOtp,
          newPassword: forgotNewPassword.trim(),
          widget_verified: forgotMode === 'phone' ? true : false,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        data = {};
      }

      if (res.ok && data.success) {
        showAlert(
          lang === 'hi' ? 'सफल' : 'Success',
          lang === 'hi'
            ? 'पासवर्ड सफलतापूर्वक बदल गया है! अब आप नए पासवर्ड से लॉगिन कर सकते हैं।'
            : 'Password reset successfully! You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (forgotIdentifier) setEmail(forgotIdentifier);
                setPassword('');
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setStep('otp');
              }
            }
          ]
        );
      } else {
        const errMsg = (lang === 'hi' ? data.errorHi : data.error) || data.error || (
          lang === 'hi' ? 'पासवर्ड बदलने में समस्या आई।' : 'Failed to reset password.'
        );
        showAlert(lang === 'hi' ? 'सूचना' : 'Notice', errMsg);
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      showAlert(
        lang === 'hi' ? 'सूचना' : 'Notice',
        lang === 'hi' ? 'पासवर्ड बदलने में समस्या आई। कृपया पुनः प्रयास करें।' : 'Failed to reset password. Please try again.'
      );
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
                    {lang === 'hi' ? 'ईमेल या मोबाइल नंबर' : 'Email or Mobile number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      lang === 'hi'
                        ? 'employee@company.com / 9876543210'
                        : 'employee@company.com / 9876543210'
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
                  style={styles.forgotPassBtn}
                  onPress={() => {
                    setForgotIdentifier(email || phone || '');
                    setForgotOtp('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setStep('fe-forgot-enter');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPassText}>
                    {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                  </Text>
                </TouchableOpacity>

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

            {/* FORGOT PASSWORD - STEP 1: ENTER PHONE/EMAIL */}
            {step === 'fe-forgot-enter' && (
              <View style={styles.otpContainer}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
                </Text>

                <Text style={styles.hintText}>
                  {lang === 'hi'
                    ? 'अपना रजिस्टर्ड मोबाइल नंबर या ईमेल दर्ज करें। सत्यापन के लिए OTP भेजा जाएगा।'
                    : 'Enter your registered mobile number or email. We will send an OTP for verification.'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'रजिस्टर्ड मोबाइल या ईमेल' : 'Registered Mobile or Email'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'hi' ? '9876543210 या email@example.com' : '9876543210 or email@example.com'}
                    placeholderTextColor="#9CA3AF"
                    value={forgotIdentifier}
                    onChangeText={setForgotIdentifier}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleFeForgotInit}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading
                      ? (lang === 'hi' ? 'प्रतीक्षा करें...' : 'Please wait...')
                      : (lang === 'hi' ? 'OTP भेजें' : 'Send OTP')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setStep('otp')}
                >
                  <Text style={styles.secondaryBtnText}>
                    {lang === 'hi' ? 'वापस लॉगिन पर जाएँ' : 'Back to Login'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FORGOT PASSWORD - STEP 2: VERIFY OTP */}
            {step === 'fe-forgot-otp' && (
              <View style={styles.otpContainer}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'OTP सत्यापन' : 'Verify OTP'}
                </Text>

                <Text style={styles.hintText}>
                  {forgotMode === 'email'
                    ? (lang === 'hi'
                        ? `रजिस्टर्ड ईमेल (${forgotMaskedTarget}) पर भेजा गया OTP दर्ज करें`
                        : `Enter OTP sent to your email (${forgotMaskedTarget})`)
                    : (lang === 'hi'
                        ? `${forgotMaskedTarget || forgotMaskedPhone} पर SMS द्वारा भेजा गया 4 अंकों का OTP दर्ज करें`
                        : `Enter 4-digit SMS OTP sent to ${forgotMaskedTarget || forgotMaskedPhone}`)}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{texts.otpLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    maxLength={4}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleFeForgotVerifyOtp}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading
                      ? (lang === 'hi' ? 'प्रतीक्षा करें...' : 'Please wait...')
                      : (lang === 'hi' ? 'OTP सत्यापित करें' : 'Verify OTP')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleFeForgotInit}
                  disabled={loading}
                >
                  <Text style={[styles.secondaryBtnText, { color: '#0EA76A', fontWeight: '700' }]}>
                    {lang === 'hi' ? 'OTP दोबारा भेजें' : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginTop: 6 }]}
                  onPress={() => setStep('fe-forgot-enter')}
                >
                  <Text style={styles.secondaryBtnText}>
                    {lang === 'hi' ? 'ईमेल या नंबर बदलें' : 'Change Email or Number'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FORGOT PASSWORD - STEP 3: SET NEW PASSWORD */}
            {step === 'fe-forgot-new-pwd' && (
              <View style={styles.otpContainer}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'नया पासवर्ड सेट करें' : 'Set New Password'}
                </Text>

                <Text style={styles.hintText}>
                  {lang === 'hi'
                    ? 'कृपया अपना नया पासवर्ड दर्ज करें (कम से कम 4 अक्षर)'
                    : 'Please enter your new password (min 4 characters)'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'hi' ? 'नया पासवर्ड दर्ज करें' : 'Enter new password'}
                    placeholderTextColor="#9CA3AF"
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {lang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'hi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Re-enter password'}
                    placeholderTextColor="#9CA3AF"
                    value={forgotConfirmPassword}
                    onChangeText={setForgotConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleFeForgotResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading
                      ? (lang === 'hi' ? 'प्रतीक्षा करें...' : 'Please wait...')
                      : (lang === 'hi' ? 'पासवर्ड सेव करें' : 'Save Password')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setStep('otp')}
                >
                  <Text style={styles.secondaryBtnText}>
                    {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </Text>
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
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 14,
    paddingVertical: 4,
  },
  forgotPassText: {
    color: '#0EA76A',
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
});

