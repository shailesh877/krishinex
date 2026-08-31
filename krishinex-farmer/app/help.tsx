// app/help.tsx — KHETIFY Help & Support

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';
const KHETIFY_GREEN_LIGHT = '#a3d546ff';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [openId, setOpenId] = useState<string | null>('q1');

  const faqList: FaqItem[] = [
    {
      id: 'q1',
      question: hi
        ? 'बुकिंग कन्फर्म कैसे होती है?'
        : 'How does booking get confirmed?',
      answer: hi
        ? 'जैसे ही आप ट्रैक्टर या सर्विस बुक करते हैं और सामने वाले vendor स्वीकार कर देता है, यहाँ My Booking में आपको कन्फर्म स्टेटस दिखेगा।'
        : 'When you book a tractor or service and the vendor accepts it, the status becomes confirmed and appears in My Bookings screen.',
    },
    {
      id: 'q2',
      question: hi
        ? 'अगर ट्रैक्टर समय पर न आए तो?'
        : 'What if tractor does not arrive on time?',
      answer: hi
        ? 'सबसे पहले vendor को सीधे कॉल करें। अगर फिर भी समस्या हो तो नीचे दिए गए WhatsApp या कॉल सपोर्ट पर शिकायत दर्ज कर सकते हैं।'
        : 'First try to call the vendor directly. If the issue remains, contact KrishiNex support via WhatsApp or phone below.',
    },
    {
      id: 'q3',
      question: hi
        ? 'सेवा का भुगतान कैसे होगा?'
        : 'How will the payment be done?',
      answer: hi
        ? 'अभी के लिए भुगतान किसान और vendor के बीच सीधे तय होगा। आने वाले समय में KrishiNex के माध्यम से सुरक्षित भुगतान की सुविधा भी जोड़ी जाएगी।'
        : 'For now, payment is handled directly between farmer and vendor. Soon, secure payments through KrishiNex will be added.',
    },
    {
      id: 'q4',
      question: hi
        ? 'प्रोफ़ाइल / बैंक डिटेल गलत हो जाए तो?'
        : 'What if my profile/bank details are wrong?',
      answer: hi
        ? 'आप Profile स्क्रीन से कभी भी अपना नाम, मोबाइल, पता और बैंक विवरण अपडेट कर सकते हैं। बदलाव तुरंत भविष्य की पेमेंट में लागू हो जाएगा।'
        : 'You can update your name, phone, address and bank details anytime from Profile. Changes will apply to future payouts.',
    },
  ];

  const t = {
    title: hi ? 'सहायता' : 'Help & Support',
    sub: hi
      ? 'अगर ऐप, बुकिंग या भुगतान से जुड़ा कोई सवाल हो'
      : 'For any question about app, bookings or payments',
    bannerLine1: hi
      ? 'किसी भी समय मदद के लिए KrishiNex टीम आपके साथ है।'
      : 'KrishiNex team is here to help you anytime.',
    bannerLine2: hi
      ? 'WhatsApp, कॉल या FAQ से जल्दी समाधान पाएं।'
      : 'Use WhatsApp, call or FAQ for quick help.',
    whatsapp: hi ? 'WhatsApp पर बात करें' : 'Chat on WhatsApp',
    call: hi ? 'कॉल सपोर्ट' : 'Call support',
    email: hi ? 'ईमेल सपोर्ट' : 'Email support',
    faq: hi ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently asked questions',
  };

  const handleWhatsApp = () => {
    const phone = '917289978002';
    const text = hi
      ? 'नमस्ते, मुझे KrishiNex ऐप में मदद चाहिए।'
      : 'Hello, I need help with KrishiNex app.';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => { });
  };

  const handleCall = () => {
    const phone = '7289978002';
    Linking.openURL(`tel:${phone}`).catch(() => { });
  };

  const handleEmail = () => {
    const email = 'Help@krishinex.com';
    Linking.openURL(`mailto:${email}`).catch(() => { });
  };

  const toggleFaq = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BANNER */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrap}>
            <Ionicons
              name="chatbubbles-outline"
              size={22}
              color={KHETIFY_GREEN_DARK}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t.sub}</Text>
            <Text style={styles.bannerText}>{t.bannerLine1}</Text>
            <Text style={styles.bannerText}>{t.bannerLine2}</Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCardFull}
            activeOpacity={0.9}
            onPress={handleWhatsApp}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="logo-whatsapp" size={24} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{t.whatsapp}</Text>
              <Text style={styles.actionSub}>
                {hi ? 'फोटो/स्क्रीनशॉट भेज सकते हैं' : 'Share photos or screenshots'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCardSmall, { marginRight: 8 }]}
              activeOpacity={0.9}
              onPress={handleCall}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="call" size={20} color="#2563EB" />
              </View>
              <Text style={styles.smallActionTitle}>{t.call}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCardSmall, { marginLeft: 8 }]}
              activeOpacity={0.9}
              onPress={handleEmail}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="mail" size={20} color="#DC2626" />
              </View>
              <Text style={styles.smallActionTitle}>{t.email}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ SECTION */}
        <View style={styles.faqHeaderRow}>
          <Text style={styles.faqHeaderTitle}>{t.faq}</Text>
          <Ionicons
            name="help-buoy-outline"
            size={18}
            color={KHETIFY_GREEN_DARK}
          />
        </View>

        <View style={styles.faqCard}>
          {faqList.map((item, index) => {
            const open = openId === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.faqItem,
                  index === faqList.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  activeOpacity={0.8}
                  onPress={() => toggleFaq(item.id)}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
                {open && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.bottomNote}>
          {hi
            ? 'अगर आपका सवाल यहाँ नहीं है, तो WhatsApp या कॉल से सीधे टीम से बात करें।'
            : 'If your question is not listed here, contact the team via WhatsApp or call.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: KHETIFY_GREEN_LIGHT,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: '#047857',
  },

  actionsContainer: {
    marginBottom: 20,
  },
  actionCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  actionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  smallActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },

  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  faqHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  faqItem: {
    borderBottomWidth: 0.7,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  faqAnswer: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },

  bottomNote: {
    marginTop: 10,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});
