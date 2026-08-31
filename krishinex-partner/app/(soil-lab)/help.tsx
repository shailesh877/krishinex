import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Linking,
    Alert,
    RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import { showAlert } from '../../components/CustomAlert';

const PHONE = '7289978002';
const EMAIL = 'Help@krishinex.com';

export default function HelpSupport() {
  const insets = useSafeAreaInsets();
    const router = useRouter();
    const { lang } = useI18n();
    const isHindi = lang === 'hi';
    const [openStep, setOpenStep] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const t = {
        hi: {
            title: 'मदद और सपोर्ट',
            contactTitle: 'हमसे संपर्क करें',
            callBtn: 'कॉल करें',
            emailBtn: 'ईमेल भेजें',
            hoursLabel: 'उपलब्धता',
            hours: 'सोमवार – शनिवार, सुबह 9 बजे – शाम 6 बजे',
            guideTitle: 'ऐप कैसे इस्तेमाल करें',
            faqTitle: 'अक्सर पूछे जाने वाले सवाल',
            steps: [
                {
                    icon: 'person-add-outline',
                    title: 'लॉगिन करें',
                    desc: 'अपना मोबाइल नंबर डालें, OTP आएगा, उसे डालें और अपनी भूमिका चुनें (Crop Buyer, Shop Partner आदि)।',
                },
                {
                    icon: 'create-outline',
                    title: 'प्रोफाइल पूरा करें',
                    desc: 'अपना नाम, पता और आधार कार्ड अपलोड करें ताकि आपका अकाउंट वेरीफाई हो सके।',
                },
                {
                    icon: 'cart-outline',
                    title: 'नयी खरीद रिक्वेस्ट करें',
                    desc: '"डैशबोर्ड" पर "नयी खरीद करें" बटन दबाएं। फसल का नाम, मात्रा और लोकेशन भरें, फिर "रिक्वेस्ट भेजें" दबाएं।',
                },
                {
                    icon: 'list-outline',
                    title: 'मेरी रिक्वेस्ट देखें',
                    desc: '"मेरी रिक्वेस्ट" में जाएं। यहाँ आपकी सभी खरीद रिक्वेस्ट और उनका स्टेटस (Pending / Accepted / Completed) दिखेगा।',
                },
                {
                    icon: 'clipboard-outline',
                    title: 'असाइन ऑर्डर',
                    desc: 'जब एडमिन किसी किसान का ऑर्डर आपको असाइन करे, वह "असाइन ऑर्डर" में दिखेगा। OK / डिलीवर / कैंसल बटन दबाकर स्टेटस अपडेट करें।',
                },
                {
                    icon: 'wallet-outline',
                    title: 'वॉलेट देखें',
                    desc: 'वॉलेट में आपके सभी ऑर्डर और कुल खर्च दिखता है। सभी पेमेंट सिर्फ एडमिन को करें।',
                },
            ],
            faqs: [
                {
                    q: 'क्या मैं अपना फोन नंबर बदल सकता हूँ?',
                    a: 'नहीं, मोबाइल नंबर लॉगिन का आधार है। बदलने के लिए सपोर्ट से संपर्क करें।',
                },
                {
                    q: 'आधार कार्ड क्यों जरूरी है?',
                    a: 'आधार कार्ड से आपकी पहचान वेरीफाई होती है, जिससे ट्रांजेक्शन सुरक्षित रहती है।',
                },
                {
                    q: 'पेमेंट कैसे करें?',
                    a: 'सभी पेमेंट सिर्फ एडमिन को करें। UPI, Bank Transfer या Card से कर सकते हैं।',
                },
                {
                    q: 'ऑर्डर कैंसल कैसे करें?',
                    a: '"असाइन ऑर्डर" या "मेरी रिक्वेस्ट" में जाकर कैंसल बटन दबाएं और वजह लिखें।',
                },
            ],
        },
        en: {
            title: 'Help & Support',
            contactTitle: 'Contact us',
            callBtn: 'Call us',
            emailBtn: 'Send email',
            hoursLabel: 'Working hours',
            hours: 'Mon – Sat, 9 AM – 6 PM',
            guideTitle: 'How to use the app',
            faqTitle: 'Frequently asked questions',
            steps: [
                {
                    icon: 'person-add-outline',
                    title: 'Login',
                    desc: 'Enter your mobile number, receive an OTP, enter it, and select your role (Crop Buyer, Shop Partner, etc.).',
                },
                {
                    icon: 'create-outline',
                    title: 'Complete your profile',
                    desc: 'Add your name, address and upload your Aadhaar card so your account can be verified.',
                },
                {
                    icon: 'cart-outline',
                    title: 'Place a new order',
                    desc: 'On the Dashboard tap "Place new order". Fill in crop name, quantity and location, then tap "Submit request".',
                },
                {
                    icon: 'list-outline',
                    title: 'View your requests',
                    desc: 'Go to "My Requests" to see all your buy requests and their status (Pending / Accepted / Completed).',
                },
                {
                    icon: 'clipboard-outline',
                    title: 'Assigned orders',
                    desc: 'When admin assigns an order to you, it appears in "Assigned orders". Tap OK / Delivered / Cancel to update the status.',
                },
                {
                    icon: 'wallet-outline',
                    title: 'Wallet',
                    desc: 'Your wallet shows all orders and total spend. Always make payments to admin only.',
                },
            ],
            faqs: [
                {
                    q: 'Can I change my phone number?',
                    a: 'No, your mobile number is your login identity. Contact support to change it.',
                },
                {
                    q: 'Why is Aadhaar required?',
                    a: 'Aadhaar verifies your identity, keeping all transactions secure.',
                },
                {
                    q: 'How do I make a payment?',
                    a: 'All payments must be made to admin only via UPI, Bank Transfer or Card.',
                },
                {
                    q: 'How do I cancel an order?',
                    a: 'Go to "Assigned orders" or "My requests", tap Cancel, and write a reason.',
                },
            ],
        },
    }[lang];

    const callSupport = () => {
        Linking.openURL(`tel:${PHONE}`).catch(() =>
            showAlert('Error', 'Could not open dialler')
        );
    };

    const emailSupport = () => {
        Linking.openURL(`mailto:${EMAIL}?subject=Krishinex Partner Support`).catch(() =>
            showAlert('Error', 'Could not open email app')
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

            {/* HEADER */}
            <LinearGradient
                colors={['#16A34A', '#15803D']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backWrap} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{t.title}</Text>
                </View>
                <View style={{ width: 36 }} />
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* CONTACT CARD */}
                <View style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                        <View style={styles.contactIconWrap}>
                            <Ionicons name="headset-outline" size={24} color="#16A34A" />
                        </View>
                        <View>
                            <Text style={styles.contactTitle}>{t.contactTitle}</Text>
                            <Text style={styles.hours}>{t.hoursLabel}: {t.hours}</Text>
                        </View>
                    </View>

                    <View style={styles.contactDivider} />

                    {/* Phone */}
                    <TouchableOpacity style={styles.contactRow} onPress={callSupport} activeOpacity={0.7}>
                        <View style={[styles.contactIconSmall, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="call-outline" size={18} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.contactLabel}>{t.callBtn}</Text>
                            <Text style={styles.contactValue}>{PHONE}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.rowDivider} />

                    {/* Email */}
                    <TouchableOpacity style={styles.contactRow} onPress={emailSupport} activeOpacity={0.7}>
                        <View style={[styles.contactIconSmall, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="mail-outline" size={18} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.contactLabel}>{t.emailBtn}</Text>
                            <Text style={styles.contactValue}>{EMAIL}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* HOW TO USE */}
                <Text style={styles.sectionTitle}>{t.guideTitle}</Text>

                {t.steps.map((step, i) => (
                    <View key={i} style={styles.stepCard}>
                        <View style={styles.stepLeft}>
                            <View style={styles.stepNumWrap}>
                                <Text style={styles.stepNum}>{i + 1}</Text>
                            </View>
                            {i < t.steps.length - 1 && <View style={styles.stepLine} />}
                        </View>
                        <View style={styles.stepRight}>
                            <View style={styles.stepIconRow}>
                                <View style={styles.stepIconWrap}>
                                    <Ionicons name={step.icon as any} size={16} color="#16A34A" />
                                </View>
                                <Text style={styles.stepTitle}>{step.title}</Text>
                            </View>
                            <Text style={styles.stepDesc}>{step.desc}</Text>
                        </View>
                    </View>
                ))}

                {/* FAQ */}
                <Text style={styles.sectionTitle}>{t.faqTitle}</Text>

                {t.faqs.map((faq, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.faqCard}
                        activeOpacity={0.85}
                        onPress={() => setOpenStep(openStep === i ? null : i)}
                    >
                        <View style={styles.faqHeader}>
                            <Ionicons name="help-circle-outline" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                            <Text style={styles.faqQ}>{faq.q}</Text>
                            <Ionicons
                                name={openStep === i ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#9CA3AF"
                            />
                        </View>
                        {openStep === i && (
                            <Text style={styles.faqA}>{faq.a}</Text>
                        )}
                    </TouchableOpacity>
                ))}

                {/* FOOTER */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Krishinex Partner App</Text>
                    <Text style={styles.footerSub}>© 2026 Krishinex · All rights reserved</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F3F4F6' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16,
    },
    backWrap: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    headerTitle: {
        fontSize: 18, fontWeight: '800', color: '#FFFFFF',
    },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },

    // CONTACT CARD
    contactCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    },
    contactHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
    },
    contactIconWrap: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center', alignItems: 'center',
    },
    contactTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
    hours: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    contactDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 14 },

    contactRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    },
    contactIconSmall: {
        width: 42, height: 42, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    contactLabel: { fontSize: 13, color: '#6B7280' },
    contactValue: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 1 },
    rowDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },

    sectionTitle: {
        fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4,
    },

    // STEPS
    stepCard: {
        flexDirection: 'row',
    },
    stepLeft: {
        alignItems: 'center', width: 32, marginRight: 12,
    },
    stepNumWrap: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#16A34A',
        justifyContent: 'center', alignItems: 'center',
    },
    stepNum: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
    stepLine: {
        width: 2, flex: 1, backgroundColor: '#D1FAE5', marginVertical: 4, minHeight: 16,
    },
    stepRight: {
        flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
        marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    stepIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    stepIconWrap: {
        width: 28, height: 28, borderRadius: 8, backgroundColor: '#ECFDF5',
        justifyContent: 'center', alignItems: 'center', marginRight: 8,
    },
    stepTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
    stepDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

    // FAQ
    faqCard: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    faqHeader: { flexDirection: 'row', alignItems: 'center' },
    faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
    faqA: {
        fontSize: 13, color: '#6B7280', marginTop: 10,
        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
        lineHeight: 20,
    },

    // FOOTER
    footer: { alignItems: 'center', paddingTop: 8 },
    footerText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
    footerSub: { fontSize: 11, color: '#D1D5DB', marginTop: 2 },
});
