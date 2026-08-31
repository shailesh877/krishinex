// app/(auth)/otp.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

const KHETIFY_GREEN_DARK = '#4b7d0a';
const KHETIFY_GREEN_LIGHT = '#a3d546';
const SHADOW_COLOR = '#00000020';

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; lang?: string }>();

  // login se language pass nahi ki to default hi (Hindi)
  const [language, setLanguage] = useState<'hi' | 'en'>(
    params.lang === 'en' ? 'en' : 'hi',
  );
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const hi = language === 'hi';
  const phone = (params.phone as string) || '+91XXXXXXXXXX';

  const t = {
    title: hi ? 'OTP वेरिफिकेशन' : 'OTP Verification',
    subtitle: hi
      ? 'हमने आपके मोबाइल नंबर पर 6 अंकों का OTP भेजा है।'
      : 'We have sent a 6-digit OTP to your mobile number.',
    inputLabel: hi ? 'OTP दर्ज करें' : 'Enter OTP',
    placeholder: hi ? '••••••' : '••••••',
    verify: hi ? 'वेरिफाई कर के आगे बढ़ें' : 'Verify & Continue',
    resend: hi ? 'OTP दोबारा भेजें' : 'Resend OTP',
    info: hi
      ? 'आपका मोबाइल नंबर सिर्फ अकाउंट सुरक्षा के लिए उपयोग किया जाएगा।'
      : 'Your mobile number is used only to secure your account.',
  };

  const onVerify = async () => {
    if (!otp.trim()) return;
    try {
      setLoading(true);
      // DUMMY: directly home tabs
      router.replace('/(tabs)/index' as any);
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    router.back();
  };

  const onToggleLanguage = () => {
    setLanguage(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      <LinearGradient
        colors={['#f3f4f6', '#e5f5dc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.title}</Text>

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

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons
              name="phone-portrait-outline"
              size={14}
              color={KHETIFY_GREEN_DARK}
            />
            <Text style={styles.badgeText}>
              {hi ? 'SMS OTP' : 'SMS OTP'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="time-outline" size={14} color="#2563eb" />
            <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>
              {hi ? '00:30 सेकंड' : '00:30 sec'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t.inputLabel}</Text>
        <Text style={styles.subTitle}>
          {hi ? 'SMS भेजा गया:' : 'OTP sent to:'}{' '}
          <Text style={styles.phoneHighlight}>{phone}</Text>
        </Text>

        <View style={styles.otpBox}>
          <TextInput
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            placeholder={t.placeholder}
            placeholderTextColor="#D1D5DB"
          />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="lock-closed-outline" size={14} color="#6b7280" />
          <Text style={styles.infoText}>{t.info}</Text>
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, !otp.trim() && { opacity: 0.6 }]}
          activeOpacity={0.9}
          onPress={onVerify}
          disabled={!otp.trim() || loading}
        >
          <LinearGradient
            colors={[KHETIFY_GREEN_DARK, KHETIFY_GREEN_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.verifyGrad}
          >
            <Text style={styles.verifyText}>
              {loading ? (hi ? 'कृपया प्रतीक्षा करें...' : 'Please wait...') : t.verify}
            </Text>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#ecfdf5"
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} activeOpacity={0.8}>
          <Ionicons
            name="refresh-outline"
            size={16}
            color={KHETIFY_GREEN_DARK}
          />
          <Text style={styles.resendText}>{t.resend}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 8,
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
  },
  langText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
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

  otpBox: {
    marginTop: 26,
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

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },

  verifyBtn: {
    marginTop: 26,
    borderRadius: 999,
    overflow: 'hidden',
  },
  verifyGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  verifyText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '900',
  },

  resendBtn: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },
});
