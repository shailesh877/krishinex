import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import NotificationIcon from '@/components/NotificationIcon';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* header with back + logo + bell */}
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(equipment)/notifications' as any)}>
          <NotificationIcon size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {isHindi ? 'नियम और शर्तें' : 'Terms & Conditions'}
        </Text>

        <Text style={styles.paragraph}>
          {isHindi
            ? 'यह ऐप किसानों और मशीन मालिकों को जोड़ने के लिए बनाया गया है। कृपया ऐप का उपयोग करते समय सभी स्थानीय कानूनों और नियमों का पालन करें।'
            : 'This app connects farmers with machine owners. Please follow all local laws and regulations while using the app.'}
        </Text>

        <Text style={styles.sectionHeading}>
          {isHindi ? '1. सेवा का उपयोग' : '1. Use of service'}
        </Text>
        <Text style={styles.paragraph}>
          {isHindi
            ? 'आप सहमत हैं कि आप इस प्लेटफॉर्म पर केवल सही जानकारी देंगे और किसी भी प्रकार का गलत उपयोग नहीं करेंगे।'
            : 'You agree to provide accurate information on this platform and not misuse the service in any way.'}
        </Text>

        <Text style={styles.sectionHeading}>
          {isHindi ? '2. बुकिंग और भुगतान' : '2. Bookings & payments'}
        </Text>
        <Text style={styles.paragraph}>
          {isHindi
            ? 'मशीन का किराया और भुगतान आपसी सहमति से तय होगा। ऐप केवल सुविधा प्रदान करता है, किसी भी विवाद के लिए पक्ष स्वयं जिम्मेदार होंगे।'
            : 'Machine rent and payments are mutually agreed between users. The app only facilitates connection; parties are responsible for resolving disputes.'}
        </Text>

        <Text style={styles.sectionHeading}>
          {isHindi ? '3. जिम्मेदारी सीमा' : '3. Limitation of liability'}
        </Text>
        <Text style={styles.paragraph}>
          {isHindi
            ? 'किसी भी नुकसान, चोट या नुकसान के लिए ऐप ऑपरेटर जिम्मेदार नहीं होगा।'
            : 'The app operator is not responsible for any loss, damage, or injury arising from the use of the service.'}
        </Text>

        <Text style={styles.sectionHeading}>
          {isHindi ? '4. बदलाव' : '4. Changes'}
        </Text>
        <Text style={styles.paragraph}>
          {isHindi
            ? 'कंपनी समय-समय पर इन शर्तों में बदलाव कर सकती है। अपडेटेड शर्तें ऐप में दिखाई जाएंगी।'
            : 'The company may update these terms from time to time. Updated terms will be shown inside the app.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 160, height: 30, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  sectionHeading: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  paragraph: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
});
