// app/soil-test.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const GREEN_LIGHT = '#a3d546ff';

const CROPS = {
  hi: ['गेहूं', 'धान', 'सरसों', 'गन्ना', 'मक्का', 'बैंगन', 'अन्य'],
  en: ['Wheat', 'Rice', 'Mustard', 'Sugarcane', 'Maize', 'Brinjal', 'Other'],
};

const SAMPLE_TYPES = {
  hi: ['खेत की मिट्टी', 'नलकूप का पानी', 'बगीचे की मिट्टी'],
  en: ['Field Soil', 'Tube Well Water', 'Garden Soil'],
};

const VISIT_TYPES = {
  hi: ['फील्ड से सैंपल उठाना', 'किसान खुद लैब आएगा'],
  en: ['Lab will collect from field', 'I will visit lab'],
};

let RAM_CACHE_SOIL_STATES: any = null;
let RAM_CACHE_SOIL_DISTRICTS: Record<string, any> = {};

export default function SoilTestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [village, setVillage] = useState<string>('');

  const [crop, setCrop] = useState<string>(CROPS[hi ? 'hi' : 'en'][0]);
  const [otherCropName, setOtherCropName] = useState<string>('');
  const [sampleType, setSampleType] = useState<string>(
    SAMPLE_TYPES[hi ? 'hi' : 'en'][0]
  );
  const [visitType, setVisitType] = useState<string>(
    VISIT_TYPES[hi ? 'hi' : 'en'][0]
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('wallet');
  const [soilPrice, setSoilPrice] = useState(250);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userStatus, setUserStatus] = useState('pending');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchStates(controller.signal);
    fetchWalletConfig();
    fetchProfileStatus();
    return () => controller.abort();
  }, []);

  const fetchProfileStatus = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data && res.data.status) {
        setUserStatus(res.data.status);
      }
    } catch (err) {
      console.log('Error fetching user status:', err);
    }
  };

  const fetchWalletConfig = async () => {
    try {
      const res = await authApi.getWalletConfig();
      if (res.data) {
        setSoilPrice(res.data.soilTestPrice || 250);
        setWalletBalance(res.data.walletBalance || 0);
      }
    } catch (err) {
      console.log('Error fetching wallet config:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      RAM_CACHE_SOIL_STATES = null;
      RAM_CACHE_SOIL_DISTRICTS = {};
      await Promise.all([
        fetchStates(),
        fetchWalletConfig(),
        selectedState ? fetchDistricts(selectedState) : Promise.resolve()
      ]);
    } catch (err) {
      console.log('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (selectedState) {
      fetchDistricts(selectedState, controller.signal);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
    }
    return () => controller.abort();
  }, [selectedState]);

  const fetchStates = async (signal?: AbortSignal) => {
    if (RAM_CACHE_SOIL_STATES) {
      setStates(RAM_CACHE_SOIL_STATES);
      if (RAM_CACHE_SOIL_STATES.length > 0) {
        setSelectedState((prev: string) => prev || RAM_CACHE_SOIL_STATES[0]);
      }
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getStates({ signal });
      setStates(res.data);
      RAM_CACHE_SOIL_STATES = res.data;
      if (res.data.length > 0) {
        setSelectedState((prev: string) => prev || res.data[0]);
      }
    } catch (e: any) {
      if (e.name !== 'CanceledError') console.error('Fetch states error', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async (state: string, signal?: AbortSignal) => {
    if (RAM_CACHE_SOIL_DISTRICTS[state]) {
      setDistricts(RAM_CACHE_SOIL_DISTRICTS[state]);
      if (RAM_CACHE_SOIL_DISTRICTS[state].length > 0) {
        setSelectedDistrict((prev: string) => prev || RAM_CACHE_SOIL_DISTRICTS[state][0]);
      }
      setLoadingDistricts(false);
      return;
    }
    setLoadingDistricts(true);
    try {
      const res = await authApi.getDistricts(state, { signal });
      setDistricts(res.data);
      RAM_CACHE_SOIL_DISTRICTS[state] = res.data;
      if (res.data.length > 0) {
        setSelectedDistrict((prev: string) => prev || res.data[0]);
      }
    } catch (e: any) {
      if (e.name !== 'CanceledError') console.error('Fetch districts error', e);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const t = {
    title: hi ? 'मिट्टी जांच बुक करें' : 'Book Soil Testing',
    sub: hi
      ? 'फसल के लिए सही खाद और दवाई जानने के लिए मिट्टी जांच करवाएं'
      : 'Test soil to know right fertiliser and treatment',

    stateLabel: hi ? 'राज्य चुनें' : 'Select State',
    districtLabel: hi ? 'जिला चुनें' : 'Select District',
    villageLabel: hi ? 'गाँव का नाम' : 'Village Name',
    villagePlaceholder: hi ? 'अपने गाँव का नाम लिखें' : 'Enter village name',

    cropLabel: hi ? 'किस फसल के लिए?' : 'For which crop?',
    sampleLabel: hi ? 'सैंपल का प्रकार' : 'Sample type',
    visitLabel: hi ? 'लैब विज़िट कैसे?' : 'Visit type',
    dateLabel: hi ? 'तारीख और समय' : 'Date & time',
    dateTitle: hi ? 'तारीख बाद में कन्फर्म होगी' : 'Date will be confirmed later',
    dateHint: hi
      ? 'फिलहाल टीम फोन पर तारीख तय करेगी'
      : 'Team will confirm date & time on call for now',
    priceInfo: hi
      ? `मिट्टी जांच शुल्क: ₹${soilPrice} प्रति सैंपल`
      : `Soil Testing Fee: ₹${soilPrice} per sample`,
    confirmBtn: hi ? 'बुकिंग कन्फर्म करें' : 'Confirm Booking',

    successTitle: hi ? 'बुकिंग सफल!' : 'Booking Successful!',
    successSub: hi
      ? 'आपकी मिट्टी जांच की रिक्वेस्ट सफलतापूर्वक दर्ज हो गई है।'
      : 'Your soil test request has been submitted successfully.',
    bookingDetails: hi ? 'बुकिंग डिटेल्स' : 'Booking Details',
    whenBooked: hi ? 'कब बुक किया गया?' : 'When was it booked?',
    yourDetails: hi ? 'आपकी डिटेल्स' : 'Your Details',
    locationDetails: hi ? 'लोकेशन डिटेल्स' : 'Location Details',
    state: hi ? 'राज्य' : 'State',
    district: hi ? 'जिला' : 'District',
    village: hi ? 'गाँव' : 'Village',
    dateOn: hi ? 'तारीख' : 'Date',
    timeAt: hi ? 'समय' : 'Time',
    crop: hi ? 'फसल' : 'Crop',
    sample: hi ? 'सैंपल' : 'Sample',
    visit: hi ? 'विज़िट' : 'Visit',
    note: hi
      ? 'हमारी टीम 24 घंटे के अंदर आपसे कॉल पर संपर्क करेगी।'
      : 'Our team will call you within 24 hours.',
    closeBtn: hi ? 'ठीक है' : 'Okay',
    backHome: hi ? 'होम पर जाएँ' : 'Go to Home',

    reportsBtn: hi ? 'रिपोर्ट्स' : 'Reports',
  };

  const created = new Date();
  const dateText = created.toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
  const timeText = created.toLocaleTimeString(hi ? 'hi-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleConfirm = async () => {
    if (userStatus !== 'approved') {
      showAlert(
        hi ? 'वेरिफिकेशन आवश्यक' : 'Verification Required',
        hi 
          ? 'मिट्टी जांच बुक करने के लिए आपका प्रोफाइल वेरीफाइड होना जरूरी है। कृपया अपनी प्रोफाइल पूरी करें और वेरिफिकेशन का इंतजार करें।' 
          : 'Your profile must be verified to book a soil test. Please complete your profile and wait for verification.',
        [
          { text: hi ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: hi ? 'प्रोफाइल पर जाएँ' : 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    if (!selectedState || !selectedDistrict || !village) {
      showAlert(hi ? 'अलर्ट' : 'Alert', hi ? 'कृपया पूरी लोकेशन भरें' : 'Please fill complete location details');
      return;
    }
    const isOther = crop === 'Other' || crop === 'अन्य';
    if (isOther && !otherCropName.trim()) {
      showAlert(hi ? 'अलर्ट' : 'Alert', hi ? 'कृपया फसल का नाम दर्ज करें' : 'Please enter the crop name');
      return;
    }
    const finalCropName = isOther ? otherCropName.trim() : crop;
    setSubmitting(true);
    try {
      const data = {
        state: selectedState,
        district: selectedDistrict,
        village,
        cropName: finalCropName,
        sampleType,
        visitType,
        paymentMethod,
        testType: 'NPK'
      };

      const res = await authApi.createSoilRequest(data);
      if (res.status === 200 || res.status === 201) {
        setShowSuccess(true);
      } else {
        showAlert('Error', 'Failed to book soil test');
      }
    } catch (err: any) {
      console.error('Soil test error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to book soil test. Please try again.';
      showAlert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    router.back();
  };

  const currentCrops = CROPS[hi ? 'hi' : 'en'];
  const currentSamples = SAMPLE_TYPES[hi ? 'hi' : 'en'];
  const currentVisits = VISIT_TYPES[hi ? 'hi' : 'en'];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.title}</Text>

        <TouchableOpacity
          style={styles.reportsBtn}
          onPress={() => router.push('/soil-reports')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={16} color={GREEN_DARK} />
          <Text style={styles.reportsBtnText}>{t.reportsBtn}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_DARK]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <Ionicons name="leaf-outline" size={22} color={GREEN_DARK} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.infoTitle}>{t.title}</Text>
            <Text style={styles.infoSub}>{t.sub}</Text>
          </View>
        </View>

        {/* STATE SELECTION */}
        <Text style={styles.sectionLabel}>{t.stateLabel}</Text>
        {loading ? (
          <ActivityIndicator size="small" color={GREEN_DARK} />
        ) : (
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setStateDropdownOpen(!stateDropdownOpen);
                setDistrictDropdownOpen(false);
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="map-outline" size={16} color={GREEN_DARK} />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {selectedState || t.stateLabel}
              </Text>
              <Ionicons
                name={stateDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>

            {stateDropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {states.map((s) => {
                    const active = s === selectedState;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedState(s);
                          setStateDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {s}
                        </Text>
                        {active && <Ionicons name="checkmark" size={16} color={GREEN_DARK} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* DISTRICT SELECTION */}
        <Text style={[styles.sectionLabel, { marginTop: stateDropdownOpen ? 0 : 12 }]}>{t.districtLabel}</Text>
        {loadingDistricts ? (
          <ActivityIndicator size="small" color={GREEN_DARK} />
        ) : (
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setDistrictDropdownOpen(!districtDropdownOpen);
                setStateDropdownOpen(false);
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="location-outline" size={16} color={GREEN_DARK} />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {selectedDistrict || t.districtLabel}
              </Text>
              <Ionicons
                name={districtDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>

            {districtDropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {districts.map((d) => {
                    const active = d === selectedDistrict;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedDistrict(d);
                          setDistrictDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {d}
                        </Text>
                        {active && <Ionicons name="checkmark" size={16} color={GREEN_DARK} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* VILLAGE INPUT */}
        <Text style={styles.sectionLabel}>{t.villageLabel}</Text>
        <TextInput
          style={styles.villageInput}
          placeholder={t.villagePlaceholder}
          value={village}
          onChangeText={setVillage}
          placeholderTextColor="#9CA3AF"
        />

        {/* CROP SELECT */}
        <Text style={styles.sectionLabel}>{t.cropLabel}</Text>
        <View style={styles.chipRow}>
          {currentCrops.map((c) => {
            const active = c === crop;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCrop(c)}
                activeOpacity={0.9}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* OTHER CROP TEXTINPUT */}
        {(crop === 'Other' || crop === 'अन्य') && (
          <TextInput
            style={styles.otherCropInput}
            placeholder={hi ? 'फसल का नाम लिखें...' : 'Type crop name...'}
            placeholderTextColor="#9CA3AF"
            value={otherCropName}
            onChangeText={setOtherCropName}
          />
        )}

        {/* SAMPLE TYPE OPTIONS */}
        <Text style={styles.sectionLabel}>{t.sampleLabel}</Text>
        <View style={styles.cardList}>
          {currentSamples.map((type) => {
            const active = type === sampleType;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => setSampleType(type)}
                activeOpacity={0.9}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.optionText}>{type}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={active ? GREEN_DARK : '#D1D5DB'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* VISIT TYPE OPTIONS */}
        <Text style={styles.sectionLabel}>{t.visitLabel}</Text>
        <View style={styles.cardList}>
          {currentVisits.map((type) => {
            const active = type === visitType;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => setVisitType(type)}
                activeOpacity={0.9}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.optionText}>{type}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={active ? GREEN_DARK : '#D1D5DB'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PAYMENT METHOD OPTIONS */}
        <Text style={styles.sectionLabel}>{hi ? 'भुगतान का तरीका' : 'Payment Method'}</Text>
        <View style={styles.cardList}>
          {/* Cash Option Removed - Wallet only */}

          {/* Wallet Option */}
          <TouchableOpacity
            style={[styles.optionRow, paymentMethod === 'wallet' && styles.optionRowActive]}
            onPress={() => setPaymentMethod('wallet')}
            activeOpacity={0.9}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.radioOuter, paymentMethod === 'wallet' && styles.radioOuterActive]}>
                {paymentMethod === 'wallet' && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.optionText}>{hi ? 'वॉलेट (ऑनलाइन भुगतान)' : 'Wallet (Pay Online)'}</Text>
                <Text style={[styles.optionSub, walletBalance < soilPrice && { color: '#EF4444' }]}>
                  {hi ? `शेष: ₹${walletBalance}` : `Balance: ₹${walletBalance}`}
                  {walletBalance < soilPrice && (hi ? ' (अपर्याप्त बैलेंस)' : ' (Insufficient Balance)')}
                </Text>
              </View>
            </View>
            <Ionicons
              name={paymentMethod === 'wallet' ? 'wallet' : 'wallet-outline'} size={20}
              color={paymentMethod === 'wallet' ? GREEN_DARK : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* DATE INFO */}
        <Text style={styles.sectionLabel}>{t.dateLabel}</Text>
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={20} color={GREEN_DARK} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.dateTitle}>{t.dateTitle}</Text>
            <Text style={styles.dateSub}>{t.dateHint}</Text>
          </View>
        </View>

        {/* PRICE INFO */}
        <View style={styles.priceCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="information-circle-outline" size={18} color={GREEN_DARK} />
              <Text style={[styles.priceText, { fontWeight: '700', marginLeft: 4 }]}>
                {hi ? `मिट्टी जांच शुल्क: ₹${soilPrice}` : `Soil Testing Fee: ₹${soilPrice}`}
              </Text>
            </View>
            <Text style={[styles.priceText, { fontSize: 11, color: '#6B7280' }]}>
              {paymentMethod === 'wallet' 
                ? (hi ? 'शुल्क तुरंत आपके वॉलेट से काट लिया जाएगा' : 'Fee will be deducted from your wallet instantly')
                : (hi ? 'शुल्क का भुगतान आपको लैब में करना होगा' : 'You will need to pay the fee at the lab')}
            </Text>
          </View>
        </View>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.confirmText}>{t.confirmBtn}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.tickCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>{t.successTitle}</Text>
            <Text style={styles.successSub}>{t.successSub}</Text>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>{t.whenBooked}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.dateOn}</Text>
                <Text style={styles.detailValue}>{dateText}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.timeAt}</Text>
                <Text style={styles.detailValue}>{timeText}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>{t.locationDetails}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.state}</Text>
                <Text style={styles.detailValue}>{selectedState}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.district}</Text>
                <Text style={styles.detailValue}>{selectedDistrict}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.village}</Text>
                <Text style={styles.detailValue}>{village}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>{t.yourDetails}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.crop}</Text>
                <Text style={styles.detailValue}>{(crop === 'Other' || crop === 'अन्य') ? (otherCropName || crop) : crop}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.sample}</Text>
                <Text style={styles.detailValue}>{sampleType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.visit}</Text>
                <Text style={styles.detailValue}>{visitType}</Text>
              </View>
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={16} color={GREEN_DARK} />
              <Text style={styles.noteText}>{t.note}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleCloseSuccess}
              activeOpacity={0.9}
            >
              <Text style={styles.closeBtnText}>{t.closeBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => {
                setShowSuccess(false);
                router.replace('/');
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.homeBtnText}>{t.backHome}</Text>
              <Ionicons name="home-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1.2,
    borderBottomColor: GREEN_LIGHT,
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
  reportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5F3D6',
  },
  reportsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: GREEN_DARK,
    marginLeft: 4,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 18,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  infoSub: {
    fontSize: 12,
    color: '#4B5563',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: GREEN_DARK,
    backgroundColor: 'rgba(152,205,6,0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: {
    color: GREEN_DARK,
  },

  // Dropdown Styles
  dropdownWrapper: {
    marginBottom: 8,
    zIndex: 10,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownBtnText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    justifyContent: 'space-between',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: GREEN_DARK,
    fontWeight: '700',
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  optionRowActive: {
    backgroundColor: '#F9FAFB',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterActive: { borderColor: GREEN_DARK },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN_DARK,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  otherCropInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#98cd06ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  dateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  dateSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  priceText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_DARK,
    paddingVertical: 12,
    borderRadius: 999,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  tickCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  detailsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '50%',
    textAlign: 'right',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    marginBottom: 16,
  },
  noteText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GREEN_DARK,
    alignItems: 'center',
    marginBottom: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: GREEN_DARK,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_DARK,
    paddingVertical: 11,
    borderRadius: 999,
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
  },
  villageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
});
