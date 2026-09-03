// app/(tabs)/sell.tsx - SELL SCREEN (with Sell History button)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { showAlert } from '@/components/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KHETIFY_GREEN = '#98cd06ff';
const KHETIFY_GREEN_DARK = '#467804ff';
const KHETIFY_GREEN_LIGHT = '#a3d546ff';
const SHADOW_COLOR = '#00000020';

let RAM_CACHE_SELL: any = null;
let RAM_CACHE_SELL_TIMESTAMP = 0;

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  // Form States
  const [crop, setCrop] = useState('');
  const [quantityKG, setQuantityKG] = useState('');
  const [quantityQuintal, setQuantityQuintal] = useState('');
  const [variety, setVariety] = useState('');
  const [expectedPriceKG, setExpectedPriceKG] = useState('');
  const [expectedPriceQuintal, setExpectedPriceQuintal] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // New Fields
  const [mandis, setMandis] = useState<any[]>([]);
  const [selectedMandi, setSelectedMandi] = useState<any>(null);
  const [moisture, setMoisture] = useState('');
  const [bagCount, setBagCount] = useState('');
  const [notes, setNotes] = useState('');
  const [mandiModalVisible, setMandiModalVisible] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [crops, setCrops] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [userAddress, setUserAddress] = useState(hi ? 'लोकेशन लोड हो रही है...' : 'Loading location...');
  
  const loadUserAddress = async () => {
    try {
      // 1. Try local cache first
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const user = JSON.parse(storedData);
        if (user.address && user.address !== 'N/A' && user.address !== 'पता नहीं') {
          setUserAddress(user.address);
        } else {
           // 2. Fetch fresh profile if cache is empty
           const res = await authApi.getProfile();
           if (res.data?.address) {
             setUserAddress(res.data.address);
           } else {
             setUserAddress(hi ? 'पता नहीं' : 'N/A');
           }
        }
      } else {
        // 3. Fallback to API if no local data
        const res = await authApi.getProfile();
        if (res.data?.address) {
          setUserAddress(res.data.address);
        } else {
          setUserAddress(hi ? 'पता नहीं' : 'N/A');
        }
      }
    } catch (e) {
      console.error('Error loading address:', e);
      setUserAddress(hi ? 'इंटरनेट समस्या' : 'N/A');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserAddress();
    }, [hi])
  );

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && RAM_CACHE_SELL) {
        setMandis(RAM_CACHE_SELL.mandis);
        setCrops(RAM_CACHE_SELL.crops);
        const age = Date.now() - RAM_CACHE_SELL_TIMESTAMP;
        if (age < 5 * 60 * 1000) {
          console.log('[DEBUG] Skipping Sell API call, RAM cache is fresh');
          return;
        }
      }
      
      const [newMandis, newCrops] = await Promise.all([fetchMandis(), fetchCrops()]);
      RAM_CACHE_SELL = { mandis: newMandis, crops: newCrops };
      RAM_CACHE_SELL_TIMESTAMP = Date.now();
    } catch (error) {
      console.error('Error fetching sell data:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    requestMediaLibraryPermission();
    fetchData();
  }, []);

  const fetchCrops = async () => {
    try {
      const res = await authApi.getCrops();
      const sortedCrops = (res.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCrops(sortedCrops);
      return sortedCrops;
    } catch (e) {
      console.error('Error fetching crops:', e);
      return [];
    }
  };

  const fetchMandis = async () => {
    try {
      const res = await authApi.getMandis();
      const sortedMandis = (res.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setMandis(sortedMandis);
      return sortedMandis;
    } catch (e) {
      console.error('Error fetching mandis:', e);
      return [];
    }
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          hi ? 'परमिशन' : 'Permission',
          hi ? 'गैलरी एक्सेस के लिए परमिशन दें' : 'Gallery permission required'
        );
      }
    }
  };

  // Camera
  const takePhoto = async () => {
    if (images.length >= 4) {
      showAlert(hi ? 'सीमा' : 'Limit', hi ? 'अधिकतम 4 फोटो' : 'Max 4 photos');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        hi ? 'कैमरा परमिशन' : 'Camera Permission',
        hi ? 'कैमरा खोलने के लिए परमिशन दें' : 'Camera permission required'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setImages(prev => [...prev, imageUri]);
    }
  };

  // Gallery
  const pickFromGallery = async () => {
    if (images.length >= 4) {
      showAlert(hi ? 'सीमा' : 'Limit', hi ? 'अधिकतम 4 फोटो' : 'Max 4 photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setImages(prev => [...prev, imageUri]);
    }
  };

  // Quantity Conversion
  const handleQuantityChange = (kg: string) => {
    setQuantityKG(kg);
    if (kg && !isNaN(Number(kg))) {
      setQuantityQuintal((Number(kg) / 100).toFixed(1));
    } else setQuantityQuintal('');
  };

  // Price Conversion
  const handlePriceChange = (priceKG: string) => {
    setExpectedPriceKG(priceKG);
    if (priceKG && !isNaN(Number(priceKG))) {
      setExpectedPriceQuintal((Number(priceKG) * 100).toFixed(0));
    } else setExpectedPriceQuintal('');
  };

  // REAL SUBMIT
  const handleSubmitSell = async () => {
    if (!crop.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'फसल का नाम भरें' : 'Enter crop name');
      return;
    }
    if (!quantityKG.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'मात्रा भरें' : 'Enter quantity');
      return;
    }
    if (!expectedPriceKG.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'मूल्य भरें' : 'Enter expected price');
      return;
    }
    if (!selectedMandi) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'मंडी चुनें' : 'Select Mandi');
      return;
    }

    try {
      setSubmitting(true);

      // Upload Images first if any
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((uri, index) => {
          const fileName = uri.split('/').pop() || `image_${index}.jpg`;
          const match = /\.(\w+)$/.exec(fileName);
          const type = match ? `image/${match[1]}` : `image`;
          
          formData.append('images', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: fileName,
            type,
          } as any);
        });

        const uploadRes = await authApi.uploadSellImages(formData);
        uploadedUrls = uploadRes.imageUrls;
      }

      const payload = {
        cropName: crop,
        variety,
        quantity: `${quantityKG} KG (${quantityQuintal} Quintal)`,
        expectedPrice: `${expectedPriceKG} / KG (₹${expectedPriceQuintal} / Quintal)`,
        mandiId: selectedMandi._id,
        moisture,
        bagCount,
        notes,
        images: uploadedUrls
      };

      await authApi.submitSellRequest(payload);

      showAlert(
        hi ? 'रिक्वेस्ट भेजी गई' : 'Request Sent',
        hi
          ? 'आपकी बिक्री रिक्वेस्ट भेज दी गई है।\nजल्द ही खरीदार आपसे संपर्क करेंगे।'
          : 'Your sell request has been sent.\nBuyers will contact you soon.',
        [{ text: hi ? 'ठीक है' : 'OK' }]
      );

      // reset
      setCrop('');
      setQuantityKG('');
      setQuantityQuintal('');
      setVariety('');
      setExpectedPriceKG('');
      setExpectedPriceQuintal('');
      setMoisture('');
      setBagCount('');
      setNotes('');
      setImages([]);
      setSelectedMandi(null);
    } catch (e) {
      console.error('Submit Error:', e);
      showAlert('Error', hi ? 'रिक्वेस्ट भेजने में विफल' : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const goToSellHistory = () => {
    router.push('/my-sell');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.8}
          onPress={() => router.push('/profile')}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.avatarImage}
          />
        </TouchableOpacity>

        <Image
          source={
            hi
              ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
              : require('../../assets/images/Khetify_use_under_the_app-English.png')
          }
          style={styles.logo}
          resizeMode="contain"
        />

        {/* SELL HISTORY BUTTON (bell ki jagah) */}
        <TouchableOpacity
          style={styles.historyBtn}
          activeOpacity={0.85}
          onPress={goToSellHistory}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={KHETIFY_GREEN_DARK}
          />
          <Text style={styles.historyText}>
            {hi ? 'रिक्वेस्ट' : 'History'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        {/* LOCATION CARD */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={16} color={KHETIFY_GREEN_DARK} />
          </View>
          <View>
            <Text style={styles.locationAddress}>{userAddress}</Text>
            <TouchableOpacity onPress={loadUserAddress}>
              <Text style={styles.locationSubtext}>
                {hi ? 'स्थान रिफ्रेश करें' : 'Refresh location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CROP DETAILS */}
        <Text style={styles.sectionTitle}>
          {hi ? 'फसल विवरण भरें' : 'Fill Crop Details'}
        </Text>
        <TouchableOpacity
          style={[styles.input, !crop && styles.requiredInput]}
          onPress={() => setCropModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: crop ? '#111827' : '#9CA3AF', fontSize: 16 }}>
              {crop ? (hi ? crops.find(c => c.name === crop)?.hindiName || crop : crop) : (hi ? 'फसल चुनें (आवश्यक*)' : 'Select Crop (Required*)')}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* QUANTITY */}
        <View style={styles.quantityRow}>
          <View style={styles.quantityInput}>
            <TextInput
              style={[styles.input, styles.quantityInputField]}
              value={quantityKG}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.unit}>{hi ? 'किलो' : 'KG'}</Text>
          </View>
          <Text style={styles.separator}>|</Text>
          <View style={styles.quantityInput}>
            <TextInput
              style={[styles.input, styles.quantityInputField]}
              value={quantityQuintal}
              editable={false}
              placeholder="0"
            />
            <Text style={styles.unit}>{hi ? 'क्विंटल' : 'Quintal'}</Text>
          </View>
        </View>

        {/* VARIETY */}
        <TextInput
          style={styles.input}
          value={variety}
          onChangeText={setVariety}
          placeholder={hi ? 'प्रजाति (वैकल्पिक)' : 'Variety (Optional)'}
          placeholderTextColor="#9CA3AF"
        />

        {/* MANDI PICKER */}
        <TouchableOpacity
          style={[styles.input, !selectedMandi && styles.requiredInput]}
          onPress={() => setMandiModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: selectedMandi ? '#111827' : '#9CA3AF', fontSize: 16 }}>
              {selectedMandi ? selectedMandi.name : (hi ? 'मंडी चुनें (आवश्यक*)' : 'Select Mandi (Required*)')}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* MOISTURE & BAGS */}
        <View style={styles.quantityRow}>
          <View style={styles.quantityInput}>
            <TextInput
              style={[styles.input, styles.quantityInputField]}
              value={moisture}
              onChangeText={setMoisture}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.unit}>{hi ? 'नमी (%)' : 'Moisture (%)'}</Text>
          </View>
          <Text style={styles.separator}>|</Text>
          <View style={styles.quantityInput}>
            <TextInput
              style={[styles.input, styles.quantityInputField]}
              value={bagCount}
              onChangeText={setBagCount}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.unit}>{hi ? 'बोरी' : 'Bags'}</Text>
          </View>
        </View>

        {/* NOTES */}
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={hi ? 'अतिरिक्त जानकारी (वैकल्पिक)' : 'Additional Notes (Optional)'}
          placeholderTextColor="#9CA3AF"
        />

        {/* PRICE */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          {hi ? 'अपेक्षित विक्रय मूल्य दर्ज करें' : 'Expected Selling Price'}
        </Text>
        <Text style={styles.priceDescription}>
          {hi ? 'वह मूल्य जिस पर आप अपनी फसल बेचना चाहते हैं' : 'The price at which you wish to sell your crop'}
        </Text>

        <View style={styles.priceRow}>
          <View style={styles.priceInput}>
            <TextInput
              style={[styles.input, styles.priceInputField]}
              value={expectedPriceKG}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.unit}>{hi ? '₹/किलो' : '₹/KG'}</Text>
            <Text style={styles.priceLabel}>{hi ? 'प्रति किलो दर' : 'Rate per KG'}</Text>
          </View>
          <Text style={styles.separator}>|</Text>
          <View style={styles.priceInput}>
            <TextInput
              style={[styles.input, styles.priceInputField]}
              value={expectedPriceQuintal}
              editable={false}
              placeholder="0"
            />
            <Text style={styles.unit}>
              {hi ? '₹/क्विंटल' : '₹/Quintal'}
            </Text>
            <Text style={styles.priceLabel}>{hi ? 'प्रति क्विंटल दर' : 'Rate per Quintal'}</Text>
          </View>
        </View>

        {/* PHOTOS */}
        <Text
          style={[styles.sectionTitle, { marginTop: 8, marginBottom: 10 }]}
        >
          {hi ? 'फसल की फोटो' : 'Crop Photos'}
        </Text>
        <View style={styles.photoRow}>
          <TouchableOpacity
            style={styles.photoInput}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <View style={styles.photoIconCircle}>
              <Ionicons name="camera-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.photoUnit}>
              {hi ? 'कैमरा' : 'Camera'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.separator}>|</Text>
          <TouchableOpacity
            style={styles.photoInput}
            onPress={pickFromGallery}
            activeOpacity={0.8}
          >
            <View style={styles.photoIconCircle}>
              <Ionicons name="image-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.photoUnit}>
              {hi ? 'गैलरी' : 'Gallery'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.photoCounter}>
          {images.length}/4 {hi ? 'फोटो जोड़ी गईं' : 'Photos Added'}
        </Text>

        {images.length > 0 && (
          <View style={styles.uploadedSection}>
            <Text style={styles.uploadedTitle}>
              {hi ? 'जोड़ी गई फोटो' : 'Uploaded Photos'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() =>
                    setImages(images.filter((_, idx) => idx !== i))
                  }
                  style={styles.deleteImageContainer}
                >
                  <Image source={{ uri: img }} style={styles.previewImage} />
                  <View style={styles.deleteIcon}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.findBuyerBtn}
          onPress={handleSubmitSell}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[KHETIFY_GREEN, KHETIFY_GREEN_DARK, '#2d5a02ff']}
            style={styles.findBuyerGradient}
          >
            <Text style={styles.findBuyerText}>
              {hi ? 'बिक्री रिक्वेस्ट भेजें' : 'Send Sell Request'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* MANDI SELECTION MODAL */}
      <Modal
        visible={mandiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMandiModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMandiModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {hi ? 'मंडी चुनें' : 'Select Mandi'}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {mandis.map((m) => (
                <TouchableOpacity
                  key={m._id}
                  style={styles.mandiOption}
                  onPress={() => {
                    setSelectedMandi(m);
                    setMandiModalVisible(false);
                  }}
                >
                  <Text style={styles.mandiName}>{m.name}</Text>
                  {selectedMandi?._id === m._id && (
                    <Ionicons name="checkmark-circle" size={20} color={KHETIFY_GREEN_DARK} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CROP SELECTION MODAL */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCropModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {hi ? 'फसल चुनें' : 'Select Crop'}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {crops.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={styles.mandiOption}
                  onPress={() => {
                    setCrop(c.name);
                    setCropModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={styles.mandiName}>{hi ? c.hindiName : c.name}</Text>
                    {hi && <Text style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>{c.name}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              {crops.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF' }}>{hi ? 'कोई फसल उपलब्ध नहीं है' : 'No crops available'}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomColor: KHETIFY_GREEN_LIGHT,
    borderBottomWidth: 1.2,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImage: { width: '100%', height: '100%' },
  logo: { height: 28, width: 150 },

  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  historyText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },

  content: { paddingHorizontal: 14, paddingVertical: 10 },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: KHETIFY_GREEN_LIGHT,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIconContainer: {
    backgroundColor: 'rgba(72, 120, 4, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },
  locationSubtext: {
    fontSize: 11,
    color: KHETIFY_GREEN_DARK,
    marginTop: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  requiredInput: { borderColor: '#F59E0B', borderWidth: 2 },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  quantityInput: { flex: 1, position: 'relative', marginHorizontal: 4 },
  priceInput: { flex: 1, position: 'relative', marginHorizontal: 4 },
  quantityInputField: { paddingRight: 42 },
  priceInputField: { paddingRight: 42 },
  separator: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D1D5DB',
    marginHorizontal: 4,
  },
  unit: {
    position: 'absolute',
    right: 12,
    top: 20,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  priceLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: -4,
    marginLeft: 6,
  },
  priceDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 2,
    fontStyle: 'italic',
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  photoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  photoUnit: { fontSize: 12, fontWeight: '700', color: '#374151' },
  photoCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },

  uploadedSection: { marginBottom: 10 },
  uploadedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  previewImage: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  deleteImageContainer: { position: 'relative' },
  deleteIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  findBuyerBtn: { marginVertical: 12, borderRadius: 16, overflow: 'hidden' },
  findBuyerGradient: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  findBuyerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  mandiOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mandiName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
});
