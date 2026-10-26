import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { authApi } from '../../services/api';
import { useI18n } from '@/context/I18nContext';
import { showAlert } from '@/components/CustomAlert';

export default function PremiumFarmerScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [premiumData, setPremiumData] = useState<any>(null);

  // TERMS MODAL & SCROLL-LOCK STATE
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollViewLayoutHeightRef = useRef<number>(0);
  const scrollViewContentHeightRef = useRef<number>(0);

  useEffect(() => {
    fetchPremiumDetails();
  }, []);

  const fetchPremiumDetails = async () => {
    try {
      setLoading(true);
      const res = await authApi.getPremiumFarmerDetails();
      if (res.data?.success) {
        setPremiumData(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching premium farmer details:', err);
      showAlert(
        hi ? 'त्रुटि' : 'Error',
        hi ? 'प्रीमियम किसान विवरण लोड करने में विफल।' : 'Failed to load premium farmer details.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if terms are short enough to unlock without scrolling
  const checkAutoUnlockOnShortContent = (layoutH: number, contentH: number) => {
    if (layoutH > 0 && contentH > 0) {
      // If content is shorter than or equal to visible viewport + 15px threshold, it cannot be scrolled
      if (contentH <= layoutH + 15) {
        setIsScrollable(false);
        setHasScrolledToBottom(true);
      } else {
        setIsScrollable(true);
        // Only keep true if already agreed previously
        if (!termsChecked) {
          setHasScrolledToBottom(false);
        }
      }
    }
  };

  // Detect when user has scrolled all the way to the bottom of the terms
  const handleTermsScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 25; // threshold
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgreeAndProceed = () => {
    if (!hasScrolledToBottom) {
      showAlert(
        hi ? 'कृपया पूरा पढ़ें' : 'Please Read Completely',
        hi
          ? 'कृपया नियम एवं शर्तें पूरी तरह नीचे तक स्क्रॉल करके पढ़ें, उसके बाद ही आगे बढ़ें।'
          : 'Please scroll down and review all terms completely before agreeing.'
      );
      return;
    }
    setTermsChecked(true);
    setTermsModalVisible(false);
  };

  const handleInitiatePayment = async () => {
    // Check if farmer is verified
    const isVerified = Boolean(
      premiumData?.user?.isVerified ||
      premiumData?.user?.profileStatus === 'approved' ||
      premiumData?.user?.kycStatus === 'verified'
    );
    if (!isVerified) {
      showAlert(
        hi ? 'सत्यापन आवश्यक (Verification Required)' : 'Verification Required',
        hi
          ? 'प्रीमियम किसान क्लब में शामिल होने के लिए आपका किसान प्रोफ़ाइल सत्यापित (Verified / Approved) होना आवश्यक है। कृपया पहले अपनी KYC व प्रोफ़ाइल सत्यापन पूरा करें।'
          : 'Your farmer profile must be verified/approved before applying for Premium Farmer Club. Please complete your profile KYC verification first.'
      );
      return;
    }

    if (!termsChecked) {
      showAlert(
        hi ? 'नियम व शर्तें आवश्यक' : 'Terms Required',
        hi
          ? 'कृपया पहले "नियम व शर्तें" खोलकर नीचे तक पढ़ें और सहमति दें।'
          : 'Please open and accept the Terms & Conditions before proceeding.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const termsVersion = premiumData?.terms?.version || 1;
      const orderRes = await authApi.createPremiumFarmerOrder(termsVersion);

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.error || 'Failed to create payment order');
      }

      // Handle Free membership plan (Fee = 0)
      if (orderRes.data?.isFree) {
        showAlert(
          hi ? 'आवेदन सफल! 🎉' : 'Application Submitted! 🎉',
          hi
            ? 'आपका आवेदन सफलतापूर्वक जमा हो गया है। आपका आवेदन "समीक्षाधीन (Approval Pending)" है। सामान्यतः 24 कार्य घंटों में व्यवस्थापक (Admin) द्वारा इसे स्वीकृत कर दिया जाता है।'
            : 'Your application was submitted successfully and is pending admin approval.'
        );
        fetchPremiumDetails();
        return;
      }

      const { order, key, applicationId } = orderRes.data;

      const options = {
        description: 'KrishiNex Premium Farmer Membership',
        image: 'https://demo.ranx24.com/images/logo.png',
        currency: 'INR',
        key: key || 'rzp_live_Tj1DcreDse1Rkh',
        amount: order.amount,
        name: 'KrishiNex Premium',
        order_id: order.id,
        prefill: {
          name: premiumData?.latestApplication?.farmerName || 'Farmer',
          contact: premiumData?.latestApplication?.farmerPhone || '',
        },
        theme: { color: '#B45309' } // Luxury Bronze/Gold
      };

      // Open Razorpay Checkout
      RazorpayCheckout.open(options)
        .then(async (razorData: any) => {
          try {
            const verifyPayload = {
              razorpay_payment_id: razorData.razorpay_payment_id || razorData.paymentId,
              razorpay_order_id: razorData.razorpay_order_id || razorData.order_id,
              razorpay_signature: razorData.razorpay_signature || razorData.signature,
              applicationId
            };
            const verifyRes = await authApi.verifyPremiumFarmerPayment(verifyPayload);
            if (verifyRes.data?.success) {
              showAlert(
                hi ? 'भुगतान सफल! 🎉' : 'Payment Successful! 🎉',
                hi
                  ? 'आपका भुगतान सफलतापूर्वक प्राप्त हो गया है। आपका आवेदन "समीक्षाधीन (Approval Pending)" है। सामान्यतः 24 कार्य घंटों में व्यवस्थापक (Admin) द्वारा इसे स्वीकृत कर दिया जाता है।'
                  : 'Your payment was successful. Application is now Approval Pending. Admin normally approves and assigns limits within 24 working hours.'
              );
              fetchPremiumDetails();
            } else {
              showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'भुगतान सत्यापन विफल रहा।' : 'Payment verification failed.');
            }
          } catch (vErr: any) {
            showAlert(hi ? 'त्रुटि' : 'Error', vErr.response?.data?.error || 'Verification error');
          }
        })
        .catch((rzpErr: any) => {
          console.log('Payment Cancelled/Failed:', rzpErr);
          showAlert(
            hi ? 'भुगतान रद्द' : 'Payment Cancelled',
            hi ? 'भुगतान प्रक्रिया पूरी नहीं हुई। आप कभी भी पुनः प्रयास कर सकते हैं।' : 'Payment was not completed. You can try again anytime.'
          );
        });

    } catch (err: any) {
      console.error('Order creation error:', err);
      showAlert(hi ? 'त्रुटि' : 'Error', err.response?.data?.error || err.message || 'Payment initiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerBox} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#B45309" />
        <Text style={styles.loadingText}>
          {hi ? 'प्रीमियम किसान विवरण लोड हो रहा है...' : 'Loading Premium Farmer details...'}
        </Text>
      </SafeAreaView>
    );
  }

  const userStatus = premiumData?.user?.status || 'none';
  const isApproved = premiumData?.user?.isPremiumFarmer && userStatus === 'approved';
  const isPending = userStatus === 'pending_approval';
  const isRejected = userStatus === 'rejected';

  const terms = premiumData?.terms || {};
  const fee = typeof terms.membershipFee === 'number' ? terms.membershipFee : 999;
  const strikeFee = typeof terms.strikeThroughFee === 'number' ? terms.strikeThroughFee : 1999;
  const validity = typeof terms.validityDays === 'number' ? terms.validityDays : 365;
  const isLifetimePlan = validity === 0 || validity >= 9999;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {hi ? 'प्रीमियम किसान क्लब' : 'Premium Farmer Club'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ============================================================== */}
        {/* CASE 1: ACTIVE APPROVED PREMIUM FARMER */}
        {/* ============================================================== */}
        {isApproved && (
          <View style={styles.approvedSection}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goldMembershipCard}
            >
              <View style={styles.cardGoldHeader}>
                <View style={styles.goldBadgePill}>
                  <Ionicons name="sparkles" size={14} color="#F59E0B" />
                  <Text style={styles.goldBadgeText}>PREMIUM MEMBER</Text>
                </View>
                <Ionicons name="ribbon" size={28} color="#F59E0B" />
              </View>

              <Text style={styles.farmerCardName}>{premiumData?.user?.name || 'Farmer'}</Text>
              <Text style={styles.memberIdText}>
                KRISHINEX-VIP • {
                  new Date(premiumData?.user?.expiresAt || 0).getFullYear() > 2090
                    ? (hi ? 'आजीवन सदस्यता (LIFETIME)' : 'LIFETIME MEMBERSHIP')
                    : (hi ? 'वार्षिक सदस्यता (VALIDATED)' : 'ANNUAL MEMBERSHIP')
                }
              </Text>

              <View style={styles.limitBox}>
                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    {hi ? 'स्वीकृत क्रेडिट सीमा' : 'Assigned Credit Limit'}
                  </Text>
                  <Text style={styles.limitVal}>₹{premiumData?.user?.limit || 0}</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.limitTrack}>
                  <View
                    style={[
                      styles.limitFill,
                      {
                        width: `${Math.min(
                          100,
                          ((premiumData?.user?.creditUsed || 0) / Math.max(1, premiumData?.user?.limit || 1)) * 100
                        )}%`
                      }
                    ]}
                  />
                </View>
                <View style={styles.limitMetaRow}>
                  <Text style={styles.limitSubText}>
                    {hi ? `उपयोग: ₹${premiumData?.user?.creditUsed || 0}` : `Used: ₹${premiumData?.user?.creditUsed || 0}`}
                  </Text>
                  <Text style={styles.limitSubText}>
                    {hi ? `शेष: ₹${Math.max(0, (premiumData?.user?.limit || 0) - (premiumData?.user?.creditUsed || 0))}` : `Available: ₹${Math.max(0, (premiumData?.user?.limit || 0) - (premiumData?.user?.creditUsed || 0))}`}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooterGold}>
                <Text style={styles.cardFooterSub}>
                  {hi
                    ? `सक्रियता: ${new Date(premiumData?.user?.activatedAt || Date.now()).toLocaleDateString('en-IN')}`
                    : `Active Since: ${new Date(premiumData?.user?.activatedAt || Date.now()).toLocaleDateString('en-IN')}`}
                </Text>
                <Text style={styles.cardFooterSub}>
                  {hi
                    ? `वैधता: ${new Date(premiumData?.user?.expiresAt || Date.now()).toLocaleDateString('en-IN')}`
                    : `Expires: ${new Date(premiumData?.user?.expiresAt || Date.now()).toLocaleDateString('en-IN')}`}
                </Text>
              </View>
            </LinearGradient>

            {/* AGREED TERMS RECORD (NEVER OVERWRITTEN) */}
            <View style={styles.signedTermsCard}>
              <View style={styles.signedTermsHeader}>
                <Ionicons name="document-text" size={20} color="#059669" />
                <Text style={styles.signedTermsTitle}>
                  {hi ? 'स्वीकृत सदस्यता नियम एवं अनुबंध' : 'Accepted Membership Agreement'}
                </Text>
              </View>
              <Text style={styles.signedTermsSub}>
                {hi
                  ? 'आपने प्रीमियम किसान सदस्यता के सभी नियमों और शर्तों को स्वीकार किया है। यह अनुबंध आपकी सदस्यता अवधि के लिए सुरक्षित और मान्य है।'
                  : 'You have reviewed and accepted the KrishiNex Premium Farmer Agreement. This record is secure and binding for your membership tenure.'}
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* CASE 2: PAYMENT COMPLETED – APPROVAL PENDING */}
        {/* ============================================================== */}
        {!isApproved && isPending && (
          <View style={styles.pendingHeroCard}>
            <LinearGradient
              colors={['#FEF3C7', '#FFFBEB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pendingGradBox}
            >
              <View style={styles.pendingIconRing}>
                <Ionicons name="hourglass-outline" size={32} color="#D97706" />
              </View>
              <Text style={styles.pendingMainTitle}>
                {Number(premiumData?.latestApplication?.paymentAmount) === 0
                  ? (hi ? 'आवेदन जमा – समीक्षाधीन' : 'Application Submitted – Under Review')
                  : (hi ? 'भुगतान सफल – समीक्षाधीन' : 'Payment Successful – Approval Pending')}
              </Text>
              <Text style={styles.pendingMainDesc}>
                {hi
                  ? 'आपका सदस्यता आवेदन प्रशासनिक समीक्षा हेतु प्राप्त हो गया है। व्यवस्थापक (Admin) द्वारा कार्य दिवसों में 24 घंटे के भीतर प्रोफाइल सत्यापन और क्रेडिट सीमा तय करके सदस्यता सक्रिय कर दी जाएगी।'
                  : 'Your application has been received and is under administrative review. The admin normally approves and assigns your operational limit within 24 working hours.'}
              </Text>

              <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{hi ? 'भुगतान राशि' : 'Amount Paid'}</Text>
                  <Text style={styles.receiptVal}>
                    {Number(premiumData?.latestApplication?.paymentAmount) === 0 ? (hi ? 'मुफ़्त (FREE)' : 'FREE') : `₹${premiumData?.latestApplication?.paymentAmount}`}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{hi ? 'ऑर्डर आईडी' : 'Order ID'}</Text>
                  <Text style={styles.receiptVal}>
                    {premiumData?.latestApplication?.razorpayOrderId || 'N/A'}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{hi ? 'नियम स्थिति' : 'Terms Status'}</Text>
                  <Text style={styles.receiptVal}>
                    {hi ? 'सहमति स्वीकृत (Accepted)' : 'Accepted'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ============================================================== */}
        {/* CASE 3: REJECTED STATE */}
        {/* ============================================================== */}
        {!isApproved && isRejected && (
          <View style={styles.rejectedCard}>
            <Ionicons name="alert-circle" size={36} color="#DC2626" />
            <Text style={styles.rejectedTitle}>
              {hi ? 'आवेदन अस्वीकृत (Application Rejected)' : 'Application Rejected'}
            </Text>
            <Text style={styles.rejectedDesc}>
              {premiumData?.latestApplication?.adminRemarks ||
                (hi
                  ? 'दस्तावेज़ों अथवा सत्यापन आवश्यकताओं की पूर्ति न होने के कारण व्यवस्थापक द्वारा आवेदन अस्वीकृत किया गया है।'
                  : 'Your application was rejected by the administrative board due to verification criteria.')}
            </Text>
          </View>
        )}

        {/* CASE 3.5: EXPIRED STATE NOTICE */}
        {!isApproved && userStatus === 'expired' && (
          <View style={[styles.rejectedCard, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
            <Ionicons name="time-outline" size={36} color="#EA580C" />
            <Text style={[styles.rejectedTitle, { color: '#C2410C' }]}>
              {hi ? 'सदस्यता समाप्त हो गई है (Membership Expired)' : 'Membership Expired'}
            </Text>
            <Text style={[styles.rejectedDesc, { color: '#9A3412' }]}>
              {hi
                ? 'आपकी पूर्व प्रीमियम सदस्यता अवधि समाप्त हो चुकी है। सभी विशेष लाभ और क्रेडिट सीमा जारी रखने हेतु कृपया नीचे वर्तमान प्लान से नवीनीकरण (Renew) करें।'
                : 'Your previous premium farmer membership has expired. Please renew using the active plan below to continue enjoying VIP credit limits and exclusive benefits.'}
            </Text>
          </View>
        )}

        {/* ============================================================== */}
        {/* CASE 4: NEW APPLICATION (NOT YET APPLIED OR REAPPLYING / RENEWING) */}
        {/* ============================================================== */}
        {!isApproved && !isPending && (
          <View>
            {/* HERO BANNER */}
            <LinearGradient
              colors={['#D97706', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroBadge}>
                <Ionicons name="diamond" size={14} color="#FEF3C7" />
                <Text style={styles.heroBadgeTxt}>
                  {terms.bannerBadgeText || 'VIP FARMER MEMBERSHIP'}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {hi
                  ? (terms.bannerTitleHi || 'कृषि-नेक्स प्रीमियम किसान बनें')
                  : (terms.bannerTitleEn || 'Join as KrishiNex Premium Farmer')}
              </Text>
              <Text style={styles.heroSub}>
                {hi
                  ? (terms.bannerSubHi || 'विशेष क्रेडिट सीमा, शून्य-कमीशन बाज़ार पहुंच, और 24×7 विशेषज्ञ कृषि डॉक्टर सेवा')
                  : (terms.bannerSubEn || 'Unlock customized agricultural credit limit, priority doctor access, and dedicated inputs.')}
              </Text>

              <View style={styles.heroFeeTag}>
                {strikeFee > fee ? (
                  <Text style={styles.heroFeeOld}>₹{strikeFee}</Text>
                ) : null}
                <Text style={styles.heroFeeNew}>
                  {fee === 0 ? (hi ? 'मुफ़्त (FREE)' : 'FREE') : `₹${fee}`}
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>
                    {' '}/ {isLifetimePlan ? (hi ? 'आजीवन (Lifetime)' : 'Lifetime') : `${validity} ${hi ? 'दिन' : 'days'}`}
                  </Text>
                </Text>
              </View>
            </LinearGradient>

            {/* KEY BENEFITS LIST (DYNAMIC FROM ADMIN) */}
            <View style={styles.benefitsCard}>
              <Text style={styles.sectionTitle}>
                {hi ? 'प्रीमियम किसान क्लब के विशेष लाभ' : 'Exclusive Premium Benefits'}
              </Text>

              {(Array.isArray(terms.benefits) && terms.benefits.filter((b: any) => b.enabled !== false).length > 0
                ? terms.benefits.filter((b: any) => b.enabled !== false)
                : [
                    {
                      titleHi: 'कस्टमाइज्ड कृषि-क्रेडिट सीमा',
                      titleEn: 'Assigned Agri-Credit Limit',
                      subHi: 'प्रशासनिक अनुमोदन पर बीज, खाद एवं उपकरणों के लिए विशेष सीमा',
                      subEn: 'Dedicated credit allocation for seeds, fertilizer, and equipment.',
                      icon: 'card',
                      bgColor: '#FEF3C7',
                      iconColor: '#D97706',
                    },
                    {
                      titleHi: 'प्राथमिकता कृषि डॉक्टर सेवा',
                      titleEn: 'Priority Agronomist Consultation',
                      subHi: 'बिना प्रतीक्षा के सीधे विशेषज्ञ से वीडियो व ऑडियो परामर्श',
                      subEn: 'Immediate access to certified agricultural scientists.',
                      icon: 'medkit',
                      bgColor: '#ECFDF5',
                      iconColor: '#059669',
                    },
                    {
                      titleHi: 'उपकरण एवं श्रम किराए पर विशेष छूट',
                      titleEn: 'Discounted Machinery & Labour',
                      subHi: 'ट्रैक्टर, हार्वेस्टर व लेबर बुकिंग पर वीआईपी रियायती दरें',
                      subEn: 'Flat member-only pricing on agricultural machinery rentals.',
                      icon: 'pricetags',
                      bgColor: '#EFF6FF',
                      iconColor: '#2563EB',
                    },
                  ]
              ).map((benefit: any, idx: number) => (
                <View key={idx} style={styles.benefitRow}>
                  <View style={[styles.benefitIconWrap, { backgroundColor: benefit.bgColor || '#FEF3C7' }]}>
                    <Ionicons
                      name={(benefit.icon || 'star') as any}
                      size={20}
                      color={benefit.iconColor || '#D97706'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benefitTitle}>
                      {hi ? benefit.titleHi || benefit.titleEn : benefit.titleEn || benefit.titleHi}
                    </Text>
                    <Text style={styles.benefitSub}>
                      {hi ? benefit.subHi || benefit.subEn : benefit.subEn || benefit.subHi}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* FIXED DYNAMIC BOTTOM ACTION BAR (FOR NEW/RENEW APPLICATION) */}
      {!isApproved && !isPending && (
        <View style={styles.fixedBottomBar}>
          {/* TERMS & CONDITIONS CHECKBOX */}
          <TouchableOpacity
            style={styles.termsCheckboxRow}
            onPress={() => setTermsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={termsChecked ? 'checkbox' : 'square-outline'}
                size={22}
                color={termsChecked ? '#059669' : '#64748B'}
              />
            </View>
            <Text style={styles.termsCheckboxText}>
              {hi ? 'मैंने ' : 'I agree to the '}
              <Text style={styles.termsLinkText}>
                {hi ? 'नियम व शर्तें' : 'Terms & Conditions'}
              </Text>
              {hi ? ' पढ़ ली हैं और सहमत हूँ' : ' of KrishiNex'}
            </Text>
          </TouchableOpacity>

          {/* PAYMENT ACTION BUTTON */}
          <TouchableOpacity
            style={[styles.paymentBtn, !termsChecked && styles.paymentBtnDisabled]}
            onPress={handleInitiatePayment}
            disabled={!termsChecked || submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.paymentBtnText}>
                  {fee === 0
                    ? (hi ? 'निःशुल्क आवेदन जमा करें' : 'Submit Free Application')
                    : (hi ? `भुगतान करें ₹${fee} एवं आवेदन जमा करें` : `Pay ₹${fee} & Submit Application`)}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.payNote}>
            {hi
              ? '🔒 सुरक्षित 256-बिट भुगतान • भुगतान उपरांत 24 कार्य घंटों में एडमिन सत्यापन'
              : '🔒 256-bit Secure Gateway • Admin approval and limit assignment within 24h'}
          </Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* MANDATORY FULL SCROLL TERMS & CONDITIONS MODAL */}
      {/* ============================================================== */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          {/* MODAL HEADER */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {hi ? terms.titleHi || 'प्रीमियम किसान नियम व शर्तें' : terms.titleEn || 'Premium Farmer Agreement'}
              </Text>
              <Text style={styles.modalVersionTag}>
                {validity === 0 || validity >= 9999 ? (hi ? '🌟 आजीवन सदस्यता (Lifetime Validity)' : '🌟 Lifetime Validity') : `📅 ${validity} ${hi ? 'दिनों की सदस्यता' : 'Days Validity'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setTermsModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* NOTICE STRIP */}
          <View style={[styles.scrollHintStrip, hasScrolledToBottom && styles.scrollHintStripSuccess]}>
            <Ionicons
              name={hasScrolledToBottom ? 'checkmark-circle' : 'arrow-down-circle'}
              size={18}
              color={hasScrolledToBottom ? '#059669' : '#D97706'}
            />
            <Text style={[styles.scrollHintText, hasScrolledToBottom && { color: '#059669' }]}>
              {hasScrolledToBottom
                ? (hi ? '✓ नियम समीक्षा पूर्ण। अब आप नीचे सहमति दे सकते हैं।' : '✓ Full agreement reviewed. You can now accept below.')
                : (hi ? 'सहमति देने हेतु कृपया स्क्रीन को अंत तक नीचे स्क्रॉल करें।' : 'Scroll all the way to the bottom to enable acceptance.')}
            </Text>
          </View>

          {/* SCROLLABLE TERMS BODY */}
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollInner}
            onScroll={handleTermsScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            onLayout={(e) => {
              const layoutH = e.nativeEvent.layout.height;
              scrollViewLayoutHeightRef.current = layoutH;
              checkAutoUnlockOnShortContent(layoutH, scrollViewContentHeightRef.current);
            }}
            onContentSizeChange={(_w, contentH) => {
              scrollViewContentHeightRef.current = contentH;
              checkAutoUnlockOnShortContent(scrollViewLayoutHeightRef.current, contentH);
            }}
          >
            <Text style={styles.termsContentText}>
              {hi ? terms.contentHi : terms.contentEn}
            </Text>

            <View style={styles.termsEndDivider}>
              <View style={styles.termsEndLine} />
              <Text style={styles.termsEndTxt}>{hi ? 'अनुबंध का अंत (End of Terms)' : 'End of Agreement'}</Text>
              <View style={styles.termsEndLine} />
            </View>
          </ScrollView>

          {/* MODAL FOOTER BUTTON */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.agreeBtn, !hasScrolledToBottom && styles.agreeBtnDisabled]}
              onPress={handleAgreeAndProceed}
              disabled={!hasScrolledToBottom}
              activeOpacity={0.85}
            >
              <Ionicons
                name={hasScrolledToBottom ? 'checkmark-done' : 'lock-closed'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.agreeBtnText}>
                {hasScrolledToBottom
                  ? (hi ? 'मैं सभी नियमों से सहमत हूँ (Agree & Continue)' : 'I Agree to All Terms & Continue')
                  : (hi ? 'अनलॉक करने हेतु नीचे तक स्क्रॉल करें' : 'Scroll Down to Unlock Acceptance')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // HERO CARD
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroBadgeTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 12,
    color: '#FEF3C7',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroFeeTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroFeeOld: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  heroFeeNew: {
    fontSize: 19,
    color: '#B45309',
    fontWeight: '900',
  },

  // BENEFITS
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  benefitSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },

  // TERMS REVIEW BOX
  termsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  // FIXED BOTTOM ACTION BAR
  fixedBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 24,
    width: 24,
  },
  termsCheckboxText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 18,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  termsLinkText: {
    color: '#D97706',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // SUBMIT PAYMENT BUTTON
  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D97706',
    height: 54,
    borderRadius: 18,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  paymentBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  paymentBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  payNote: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  // APPROVED MEMBERSHIP GOLD CARD
  approvedSection: {
    marginBottom: 20,
  },
  goldMembershipCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardGoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goldBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goldBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  farmerCardName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  memberIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 2,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  limitBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  limitVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#34D399',
  },
  limitTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  limitFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  limitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitSubText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardFooterGold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFooterSub: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
  },

  // SIGNED TERMS PERMANENT CARD
  signedTermsCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 16,
  },
  signedTermsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  signedTermsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  signedTermsSub: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },

  // PENDING HERO
  pendingHeroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  pendingGradBox: {
    padding: 22,
    alignItems: 'center',
  },
  pendingIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  pendingMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingMainDesc: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },

  // REJECTED CARD
  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    marginBottom: 16,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#991B1B',
    marginTop: 8,
    marginBottom: 4,
  },
  rejectedDesc: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 17,
  },

  // MODAL STYLES
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalVersionTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  scrollHintStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  scrollHintStripSuccess: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  scrollHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalScrollInner: {
    padding: 20,
    paddingBottom: 40,
  },
  termsContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  termsEndDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },
  termsEndLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  termsEndTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    height: 50,
    borderRadius: 14,
  },
  agreeBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  agreeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
