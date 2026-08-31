import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/orders`;

export default function BuyerCreateOrder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();

  const t = {
    hi: {
      headerTitle: 'खरीद रिक्वेस्ट', formTitle: 'नयी खरीद रिक्वेस्ट',
      cropLabel: 'फसल का नाम', cropPlaceholder: 'जैसे: गेहूं, धान',
      quantityLabel: 'कितना चाहिए (क्विंटल में)', quantityPlaceholder: 'उदा. 10',
      varietyLabel: 'वैरायटी (वैकल्पिक)', varietyPlaceholder: 'जैसे: PBW-343 (वैकल्पिक)',
      locationLabel: 'लोकेशन', locationPlaceholder: 'आपका वर्तमान लोकेशन अपने आप भर जाएगा',
      noteLabel: 'नोट (वैकल्पिक)', notePlaceholder: 'कोई खास निर्देश लिखें (वैकल्पिक)',
      submitBtn: 'रिक्वेस्ट भेजें', requestsBtn: 'मेरी रिक्वेस्ट',
    },
    en: {
      headerTitle: 'Buy request', formTitle: 'New buy request',
      cropLabel: 'Crop name', cropPlaceholder: 'e.g. Wheat, Paddy',
      quantityLabel: 'How much (in quintal)', quantityPlaceholder: 'e.g. 10',
      varietyLabel: 'Variety (optional)', varietyPlaceholder: 'e.g. PBW-343 (optional)',
      locationLabel: 'Location', locationPlaceholder: 'Your current location will auto-fill here',
      noteLabel: 'Note (optional)', notePlaceholder: 'Any special instructions (optional)',
      submitBtn: 'Submit request', requestsBtn: 'My requests',
    },
  }[lang];

  const [crop, setCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [variety, setVariety] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(React.useCallback(() => { checkProfileStatus(); }, []));

  const checkProfileStatus = async () => {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.status && user.status !== 'approved') {
        showAlert(
          lang === 'hi' ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
          lang === 'hi' ? 'आपकी प्रोफाइल अभी वेरिफाय नहीं हुई है। आप अभी रिक्वेस्ट नहीं भेज सकते।' : 'Your profile is not verified yet. You cannot send requests.'
        );
        if (router.canGoBack()) router.back(); else router.replace('/(buyer)/home');
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) {
          const g = geo[0];
          setLocation([g.city || g.subregion || g.region || '', g.region || ''].filter(Boolean).join(', '));
        }
      } catch (e) {}
    })();
  }, []);

  const handleSubmit = async () => {
    if (!crop.trim()) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'कृपया फसल का नाम भरें' : 'Please enter crop name'); return; }
    if (crop.trim().length < 2) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'फसल का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Crop name must be at least 2 characters'); return; }
    if (!quantity.trim()) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'कृपया मात्रा भरें' : 'Please enter quantity'); return; }
    const qtyNum = parseFloat(quantity.trim());
    if (isNaN(qtyNum) || qtyNum <= 0) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'कृपया सही मात्रा भरें (0 से अधिक)' : 'Please enter a valid quantity (greater than 0)'); return; }
    if (variety.trim() && variety.trim().length < 2) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'वैरायटी कम से कम 2 अक्षर की होनी चाहिए' : 'Variety must be at least 2 characters'); return; }
    if (!location.trim()) { showAlert(lang === 'hi' ? 'त्रुटि' : 'Error', lang === 'hi' ? 'कृपया लोकेशन भरें' : 'Please enter location'); return; }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { showAlert('Error', 'Not logged in'); return; }
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ crop: crop.trim(), quantity: qtyNum, variety: variety.trim(), location: location.trim(), note: note.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(lang === 'hi' ? 'सफल!' : 'Success!', lang === 'hi' ? 'रिक्वेस्ट भेज दी गई है' : 'Your request has been submitted',
          [{ text: 'OK', onPress: () => router.push('/(buyer)/my-requests') }]);
      } else {
        showAlert('Error', data.error || 'Failed to submit request');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = !crop || !quantity || !location || submitting;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backWrap} onPress={() => router.push('/(buyer)/home')}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.requestBtn} onPress={() => router.push('/(buyer)/my-requests')}>
          <Ionicons name="list-outline" size={14} color="#2563EB" />
          <Text style={styles.requestBtnText}>{t.requestsBtn}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerBorder} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 14, flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>{t.headerTitle}</Text>
            <Text style={styles.pageSubtitle}>{t.formTitle}</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.cropLabel}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="leaf-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput style={styles.input} placeholder={t.cropPlaceholder} placeholderTextColor="#9CA3AF" value={crop} onChangeText={setCrop} returnKeyType="next" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.quantityLabel}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="scale-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput style={styles.input} placeholder={t.quantityPlaceholder} placeholderTextColor="#9CA3AF" keyboardType="numeric" value={quantity} onChangeText={setQuantity} returnKeyType="next" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.varietyLabel}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput style={styles.input} placeholder={t.varietyPlaceholder} placeholderTextColor="#9CA3AF" value={variety} onChangeText={setVariety} returnKeyType="next" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.locationLabel}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="location-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput style={styles.input} placeholder={t.locationPlaceholder} placeholderTextColor="#9CA3AF" value={location} onChangeText={setLocation} returnKeyType="next" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.noteLabel}</Text>
              <View style={[styles.inputWithIcon, { alignItems: 'flex-start' }]}>
                <Ionicons name="create-outline" size={18} color="#9CA3AF" style={{ marginRight: 6, marginTop: 8 }} />
                <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder={t.notePlaceholder} placeholderTextColor="#9CA3AF" multiline value={note} onChangeText={setNote} />
              </View>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, isDisabled && { opacity: 0.5 }]} disabled={isDisabled} onPress={handleSubmit}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>{t.submitBtn}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E7EB' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  backWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  requestBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EFF6FF', gap: 4 },
  requestBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  headerBorder: { height: 2, backgroundColor: '#87D528' },
  scroll: { flex: 1 },
  pageTitleRow: { marginBottom: 6 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  card: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 2, backgroundColor: '#F9FAFB' },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  primaryBtn: { marginTop: 8, backgroundColor: '#16A34A', borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
