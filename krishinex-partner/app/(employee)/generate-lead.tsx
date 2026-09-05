import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

type Category = 'Kisan' | 'Dukan';

export default function GenerateLeadScreen() {
  
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>('Kisan');
  
  // Common Fields
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  // Kisan Fields
  const [farmerName, setFarmerName] = useState('');
  const [village, setVillage] = useState('');
  const [landSize, setLandSize] = useState('');
  const [currentCrop, setCurrentCrop] = useState('');
  const [needsNexCard, setNeedsNexCard] = useState<'Yes' | 'No' | ''>('');

  // Dukan Fields
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopCategory, setShopCategory] = useState('');
  const [partnerInterest, setPartnerInterest] = useState<'High' | 'Low' | ''>('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(isHindi ? 'अनुमति आवश्यक' : 'Permission Required', isHindi ? 'कैमरा एक्सेस की आवश्यकता है' : 'Camera access is needed');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7 });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // mobile — exactly 10 digits
    const mobileClean = mobile.trim().replace(/\D/g, '');
    if (!mobileClean || mobileClean.length !== 10) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    // address — required, min 5 chars
    if (!address.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया पता दर्ज करें' : 'Enter address');
      return;
    }
    if (address.trim().length < 5) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'पता कम से कम 5 अक्षर का होना चाहिए' : 'Address must be at least 5 characters');
      return;
    }

    // Kisan-specific validations
    if (category === 'Kisan') {
      if (!farmerName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया किसान का नाम भरें' : 'Please enter farmer name');
        return;
      }
      if (farmerName.trim().length < 2) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
        return;
      }
      if (!village.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया गांव का नाम भरें' : 'Please enter village name');
        return;
      }
      // landSize — optional, if filled must be positive number
      if (landSize.trim()) {
        const landNum = parseFloat(landSize.trim());
        if (isNaN(landNum) || landNum <= 0) {
          showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'जमीन का आकार सही नहीं है' : 'Please enter a valid land size (greater than 0)');
          return;
        }
      }
      // currentCrop — optional, if filled min 2 chars
      if (currentCrop.trim() && currentCrop.trim().length < 2) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'फसल का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Crop name must be at least 2 characters');
        return;
      }
    }

    // Dukan-specific validations
    if (category === 'Dukan') {
      if (!shopName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया दुकान का नाम भरें' : 'Please enter shop name');
        return;
      }
      if (shopName.trim().length < 2) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'दुकान का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Shop name must be at least 2 characters');
        return;
      }
      if (!ownerName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया मालिक का नाम भरें' : 'Please enter owner name');
        return;
      }
      if (ownerName.trim().length < 2) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'मालिक का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Owner name must be at least 2 characters');
        return;
      }
      // shopCategory — optional, if filled min 2 chars
      if (shopCategory.trim() && shopCategory.trim().length < 2) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'दुकान की श्रेणी कम से कम 2 अक्षर की होनी चाहिए' : 'Shop category must be at least 2 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('category', category);
      formData.append('mobile', mobile);
      formData.append('address', address);

      if (category === 'Kisan') {
        formData.append('farmerDetails', JSON.stringify({
          name: farmerName,
          village,
          landSize,
          currentCrop,
          needsNexCard
        }));
      } else {
        formData.append('shopDetails', JSON.stringify({
          shopName,
          ownerName,
          shopCategory,
          partnerInterest
        }));
      }

      if (photo) {
        const uriParts = photo.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('photo', {
          uri: photo,
          name: `lead_${Date.now()}.${fileType}`,
          type: `image/${fileType}` } as any);
      }

      const res = await fetch(`${API_URL}/employee/leads/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' },
        body: formData });

      const data = await res.json();
      if (res.ok) {
        showAlert(isHindi ? 'सफलता' : 'Success', isHindi ? 'लीड सफलतापूर्वक जनरेट हो गई' : 'Lead generated successfully');
        router.back();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Submit lead error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Server Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isHindi ? 'लीड जनरेट करें' : 'Generate Lead'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{isHindi ? 'कैटेगरी चुनें' : 'Select Category'}</Text>
          <View style={styles.categoryRow}>
            <TouchableOpacity 
              style={[styles.categoryBtn, category === 'Kisan' && styles.categoryBtnActive]} 
              onPress={() => setCategory('Kisan')}
            >
              <Ionicons name="leaf" size={20} color={category === 'Kisan' ? '#FFF' : '#64748B'} />
              <Text style={[styles.categoryBtnText, category === 'Kisan' && styles.categoryBtnTextActive]}>
                {isHindi ? 'किसान' : 'Farmer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryBtn, category === 'Dukan' && styles.categoryBtnActive]} 
              onPress={() => setCategory('Dukan')}
            >
              <Ionicons name="business" size={20} color={category === 'Dukan' ? '#FFF' : '#64748B'} />
              <Text style={[styles.categoryBtnText, category === 'Dukan' && styles.categoryBtnTextActive]}>
                {isHindi ? 'दुकान' : 'Shop'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{isHindi ? 'विवरण भरें' : 'Enter Details'}</Text>
          
          {category === 'Kisan' ? (
            <>
              <Input label={isHindi ? 'किसान का नाम' : 'Farmer Name'} value={farmerName} onChange={setFarmerName} placeholder="Enter name" />
              <Input label={isHindi ? 'गाँव' : 'Village'} value={village} onChange={setVillage} placeholder="Enter village" />
              <Input label={isHindi ? 'ज़मीन (एकड़)' : 'Land Size (Acre)'} value={landSize} onChange={setLandSize} placeholder="e.g. 5" keyboardType="numeric" />
              <Input label={isHindi ? 'वर्तमान फसल' : 'Current Crop'} value={currentCrop} onChange={setCurrentCrop} placeholder="e.g. Wheat" />
              
              <Text style={styles.label}>{isHindi ? 'NexCard चाहिए?' : 'Need NexCard?'}</Text>
              <View style={styles.optionRow}>
                {['Yes', 'No'].map((opt) => (
                  <TouchableOpacity 
                    key={opt}
                    style={[styles.choiceBtn, needsNexCard === opt && styles.choiceBtnActive]}
                    onPress={() => setNeedsNexCard(opt as any)}
                  >
                    <Text style={[styles.choiceText, needsNexCard === opt && styles.choiceTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Input label={isHindi ? 'दुकान का नाम' : 'Shop Name'} value={shopName} onChange={setShopName} placeholder="Enter shop name" />
              <Input label={isHindi ? 'दुकानदार का नाम' : 'Owner Name'} value={ownerName} onChange={setOwnerName} placeholder="Enter owner name" />
              <Input label={isHindi ? 'दुकान कैटेगरी' : 'Shop Category'} value={shopCategory} onChange={setShopCategory} placeholder="e.g. Seeds, Pesticides" />
              
              <Text style={styles.label}>{isHindi ? 'Interest (KrishiNex Partner)' : 'Interest (KrishiNex Partner)'}</Text>
              <View style={styles.optionRow}>
                {['High', 'Low'].map((opt) => (
                  <TouchableOpacity 
                    key={opt}
                    style={[styles.choiceBtn, partnerInterest === opt && styles.choiceBtnActive]}
                    onPress={() => setPartnerInterest(opt as any)}
                  >
                    <Text style={[styles.choiceText, partnerInterest === opt && styles.choiceTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Common Fields */}
          <Input label={isHindi ? 'मोबाइल नंबर' : 'Mobile Number'} value={mobile} onChange={setMobile} placeholder="10 digit number" keyboardType="phone-pad" maxLength={10} />
          <Input label={isHindi ? 'पता' : 'Address'} value={address} onChange={setAddress} placeholder="Full address" multiline />

          {/* Photo Selection */}
          <Text style={styles.label}>{isHindi ? 'फोटो लें' : 'Take Photo'}</Text>
          <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.previewImg} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                <Text style={styles.photoPlaceholder}>{isHindi ? 'कैमरा खोलें' : 'Open Camera'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && styles.disabledBtn]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{isHindi ? 'लीड सबमिट करें' : 'Submit Lead'}</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false, maxLength }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        style={[styles.input, multiline && styles.textArea]} 
        value={value} 
        onChangeText={onChange} 
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 16,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: STATUS_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#64748B',
    shadowOpacity: 0.1,
    shadowRadius: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 15 },
  categoryRow: { flexDirection: 'row', gap: 12 },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 },
  categoryBtnActive: { backgroundColor: STATUS_GREEN, borderColor: STATUS_GREEN },
  categoryBtnText: { fontWeight: '700', color: '#64748B' },
  categoryBtnTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#1E293B' },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  choiceBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center' },
  choiceBtnActive: { backgroundColor: '#F0FDF4', borderColor: STATUS_GREEN },
  choiceText: { fontWeight: '700', color: '#64748B' },
  choiceTextActive: { color: STATUS_GREEN },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  photoBox: {
    height: 160,
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  photoPlaceholder: { marginTop: 8, fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  submitBtn: {
    backgroundColor: STATUS_GREEN,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: STATUS_GREEN,
    shadowOpacity: 0.3 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 } });
