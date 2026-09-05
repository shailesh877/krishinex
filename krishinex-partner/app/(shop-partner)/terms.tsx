// app/(shop-partner)/terms.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';

export default function TermsScreen() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>
              {isHindi ? 'नियम और शर्तें' : 'Terms & conditions'}
            </Text>
            <Text style={styles.headerSub}>
              {isHindi
                ? 'ऐप उपयोग से जुड़ी जरूरी जानकारी'
                : 'Important information about using this app'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isHindi ? '1. सेवा का उपयोग' : '1. Use of service'}
          </Text>
          <Text style={styles.sectionText}>
            {isHindi
              ? 'यह ऐप सिर्फ रजिस्टर्ड कृषि दुकानदार पार्टनर्स के लिए है. आप अपने अकाउंट की login जानकारी किसी और के साथ शेयर नहीं करेंगे.'
              : 'This app is only for registered agri shop partners. You agree not to share your login details with anyone else.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isHindi ? '2. ऑर्डर और भुगतान' : '2. Orders and payments'}
          </Text>
          <Text style={styles.sectionText}>
            {isHindi
              ? 'आप द्वारा accept किए गए सभी ऑर्डर समय पर पूरा करने की जिम्मेदारी आपकी होगी. पेमेंट से जुड़ी जानकारी अलग एग्रीमेंट के अनुसार लागू होगी.'
              : 'You are responsible for fulfilling all accepted orders on time. Payment terms will follow the separate partner agreement.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isHindi ? '3. डेटा और प्राइवेसी' : '3. Data & privacy'}
          </Text>
          <Text style={styles.sectionText}>
            {isHindi
              ? 'हम आपके दुकान और किसान ग्राहकों के डेटा का उपयोग सिर्फ सर्विस बेहतर बनाने और कानूनी compliance के लिए करते हैं.'
              : 'Shop and farmer data is used only to improve the service and comply with legal requirements.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isHindi ? '4. बदलाव' : '4. Changes to terms'}
          </Text>
          <Text style={styles.sectionText}>
            {isHindi
              ? 'कंपनी समय-समय पर इन नियमों में बदलाव कर सकती है. बड़े बदलाव होने पर ऐप के अंदर आपको सूचना दी जाएगी.'
              : 'The company may update these terms from time to time. You will be notified inside the app for major changes.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'सहमति' : 'Your agreement'}
          </Text>
          <Text style={styles.sectionText}>
            {isHindi
              ? 'ऐप का उपयोग जारी रखने का मतलब है कि आप ऊपर दिए गए सभी नियम और शर्तों से सहमत हैं.'
              : 'By continuing to use this app, you agree to the terms and conditions mentioned above.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020' },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4 },
  sectionText: {
    fontSize: 12,
    color: '#4B5563' } });
