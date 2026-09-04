import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

import { BASE_URL, BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/user`;

export default function LabourProfileSettings() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const isHindi = lang === 'hi';

  // main profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [baseVillage, setBaseVillage] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState('15');
  const [ratePerDay, setRatePerDay] = useState('700');
  const [ratePerHour, setRatePerHour] = useState('90');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDescription, setSkillDescription] = useState('');

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [jobNotificationOn, setJobNotificationOn] = useState(true);
  const [whatsappOn, setWhatsappOn] = useState(true);
  const [status, setStatus] = useState('pending');

  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // which modal open
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editWorkModal, setEditWorkModal] = useState(false);
  const [editPhotoModal, setEditPhotoModal] = useState(false);
  const [editBankModal, setEditBankModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const { profile, refreshUser, updateUser } = useUser();

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setBaseVillage(profile.address || '');
      setMaxDistanceKm(profile.maxDistanceKm ? profile.maxDistanceKm.toString() : '15');
      setRatePerDay(profile.ratePerDay ? profile.ratePerDay.toString() : '700');
      setRatePerHour(profile.ratePerHour ? profile.ratePerHour.toString() : '90');
      setAadhaarNumber(profile.aadhaarNumber || '');
      setAadhaarDocName(profile.aadhaarDocUrl ? (isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)') : null);
      setAadhaarDocUrl(profile.aadhaarDocUrl || null);
      setAadhaarBackDocName(profile.aadhaarBackDocUrl ? (isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)') : null);
      setAadhaarBackDocUrl(profile.aadhaarBackDocUrl || null);
      if (profile.avatarUri) {
        setAvatarUri(profile.avatarUri);
      }
      if (profile.jobNotificationOn !== undefined) setJobNotificationOn(profile.jobNotificationOn);
      if (profile.whatsappOn !== undefined) setWhatsappOn(profile.whatsappOn);
      setSkills(profile.skills || []);
      setSkillDescription(profile.skillDescription || '');

      setStatus(profile.status || 'pending');
      const bd = profile.bankDetails || {};
      setBankHolder(bd.holderName || '');
      setBankName(bd.bankName || '');
      setBankAccount(bd.accountNumber || '');
      setBankIfsc(bd.ifscCode || '');
      
      setLoading(false);
    }
  }, [profile, isHindi]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      await refreshUser();
    } catch (error) {
      console.error('Error fetching labour profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const texts = {
    title: isHindi ? 'मेरा प्रोफाइल' : 'My profile',
    sub: isHindi
      ? 'आप खुद labour हैं, अपनी डिटेल यहां देख और बदल सकते हैं'
      : 'You are the labour, view and edit your details here',
    aadhaarLabel: isHindi ? 'आधार नंबर' : 'Aadhaar number',
    aadhaarPlaceholder: isHindi
      ? '12 अंकों का आधार नंबर'
      : '12 digit Aadhaar number',
    aadhaarDoc: isHindi ? 'आधार डॉक्यूमेंट (Front)' : 'Aadhaar document (Front)',
    aadhaarDocBack: isHindi ? 'आधार डॉक्यूमेंट (Back)' : 'Aadhaar document (Back)',
    aadhaarDocNotUploaded: isHindi
      ? 'अभी तक कोई डॉक्यूमेंट अपलोड नहीं किया गया'
      : 'No Aadhaar document uploaded yet',
    viewOrUploadAadhaar: isHindi
      ? 'आधार देखें / अपलोड करें'
      : 'View / Upload Aadhaar',
    loading: isHindi ? 'लोड हो रहा है...' : 'Loading...',
  };

  // local temp fields for modals
  const [tempName, setTempName] = useState(name);
  const [tempPhone, setTempPhone] = useState(phone);
  const [tempEmail, setTempEmail] = useState(email);
  const [tempVillage, setTempVillage] = useState(baseVillage);
  const [tempDistance, setTempDistance] = useState(maxDistanceKm);
  const [tempDayRate, setTempDayRate] = useState(ratePerDay);
  const [tempHourRate, setTempHourRate] = useState(ratePerHour);
  const [tempAadhaar, setTempAadhaar] = useState(aadhaarNumber);
  const [tempSkills, setTempSkills] = useState<string[]>([]);
  const [tempSkillDescription, setTempSkillDescription] = useState(skillDescription);

  const [tempBankHolder, setTempBankHolder] = useState(bankHolder);
  const [tempBankName, setTempBankName] = useState(bankName);
  const [tempBankAccount, setTempBankAccount] = useState(bankAccount);
  const [tempBankIfsc, setTempBankIfsc] = useState(bankIfsc);

  const openProfileModal = () => {
    setTempName(name);
    setTempPhone(phone);
    setTempEmail(email);
    setTempVillage(baseVillage);
    setTempAadhaar(aadhaarNumber);
    setEditProfileModal(true);
  };

  const saveProfileModal = async () => {
    // name — required, min 2 chars
    if (!tempName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया नाम भरें' : 'Please enter your name');
      return;
    }
    if (tempName.trim().length < 2) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
      return;
    }
    // email — optional, if filled validate format
    if (tempEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tempEmail.trim())) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही ईमेल पता भरें' : 'Please enter a valid email address');
        return;
      }
    }
    // village/address — required, min 3 chars
    if (!tempVillage.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया पता भरें' : 'Please enter address');
      return;
    }
    if (tempVillage.trim().length < 3) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'पता कम से कम 3 अक्षर का होना चाहिए' : 'Address must be at least 3 characters');
      return;
    }
    // aadhaar — optional, if filled must be exactly 12 digits
    if (tempAadhaar.trim()) {
      const aadhaarClean = tempAadhaar.trim().replace(/\D/g, '');
      if (aadhaarClean.length !== 12) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'आधार नंबर 12 अंकों का होना चाहिए' : 'Aadhaar number must be exactly 12 digits');
        return;
      }
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tempName,
          email: tempEmail,
          address: tempVillage,
          aadhaarNumber: tempAadhaar
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'प्रोफाइल अपडेट हो गई!' : 'Profile details updated!');
        
        updateUser({
          name: tempName.trim(),
          email: tempEmail.trim(),
          address: tempVillage.trim(),
          aadhaarNumber: tempAadhaar.trim(),
        });
        
        setEditProfileModal(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating profile');
    }
  };

  const openWorkModal = () => {
    setTempDistance(maxDistanceKm);
    setTempDayRate(ratePerDay);
    setTempHourRate(ratePerHour);
    setTempSkills([...skills]);
    setTempSkillDescription(skillDescription);
    setEditWorkModal(true);
  };

  const saveWorkModal = async () => {
    // maxDistance — required, positive number
    const dist = parseFloat(tempDistance.trim());
    if (!tempDistance.trim() || isNaN(dist) || dist <= 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही दूरी भरें (0 से अधिक)' : 'Please enter a valid distance (greater than 0)');
      return;
    }
    // ratePerDay — required, positive number
    const dayRate = parseFloat(tempDayRate.trim());
    if (!tempDayRate.trim() || isNaN(dayRate) || dayRate <= 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही दैनिक दर भरें (0 से अधिक)' : 'Please enter a valid day rate (greater than 0)');
      return;
    }
    // ratePerHour — required, positive number
    const hourRate = parseFloat(tempHourRate.trim());
    if (!tempHourRate.trim() || isNaN(hourRate) || hourRate <= 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही प्रति घंटा दर भरें (0 से अधिक)' : 'Please enter a valid hourly rate (greater than 0)');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          maxDistanceKm: tempDistance,
          ratePerDay: tempDayRate,
          ratePerHour: tempHourRate,
          skills: tempSkills,
          skillDescription: tempSkillDescription
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'काम और रेट अपडेट हो गए!' : 'Work & rates updated!');
        
        updateUser({
          skills: tempSkills,
          skillDescription: tempSkillDescription.trim(),
          maxDistanceKm: parseInt(tempDistance, 10),
          ratePerDay: parseInt(tempDayRate, 10),
          ratePerHour: parseInt(tempHourRate, 10),
        });
        
        setEditWorkModal(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update work settings');
      }
    } catch (error) {
      console.error('Error updating work settings:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating work settings');
    }
  };

  const openBankModal = () => {
    if (status === 'approved') {
      showAlert(
        isHindi ? 'बदलाव संभव नहीं' : 'Update not possible',
        isHindi 
          ? 'आपका प्रोफाइल वेरिफाइड है। बैंक डिटेल्स बदलने के लिए एडमिन से संपर्क करें।' 
          : 'Your profile is verified. Please contact admin to change bank details.'
      );
      return;
    }
    setTempBankHolder(bankHolder);
    setTempBankName(bankName);
    setTempBankAccount(bankAccount);
    setTempBankIfsc(bankIfsc);
    setEditBankModal(true);
  };

  const saveBankModal = async () => {
    // holderName — required, min 2 chars
    if (!tempBankHolder.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया खाताधारक का नाम भरें' : 'Please enter account holder name');
      return;
    }
    if (tempBankHolder.trim().length < 2) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
      return;
    }
    // bankName — required
    if (!tempBankName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया बैंक का नाम भरें' : 'Please enter bank name');
      return;
    }
    // accountNumber — required, 9–18 digits
    const accClean = tempBankAccount.trim().replace(/\D/g, '');
    if (!accClean || accClean.length < 9 || accClean.length > 18) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'खाता नंबर 9 से 18 अंकों का होना चाहिए' : 'Account number must be 9 to 18 digits');
      return;
    }
    // IFSC — required, format: 4 letters + 0 + 6 alphanumeric
    const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
    if (!tempBankIfsc.trim() || !ifscRegex.test(tempBankIfsc.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही IFSC कोड भरें (जैसे: SBIN0001234)' : 'Please enter a valid IFSC code (e.g. SBIN0001234)');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bankDetails: {
            holderName: tempBankHolder,
            bankName: tempBankName,
            accountNumber: tempBankAccount,
            ifscCode: tempBankIfsc
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'बैंक डिटेल्स अपडेट हो गई!' : 'Bank details updated!');
        setEditBankModal(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error');
    }
  };

  const handleChangePhoto = async () => {
    setEditPhotoModal(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setAvatarUri(selectedUri);
      await uploadAvatar(selectedUri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('photo', { uri, name: filename, type } as any);

      const res = await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        const pfp = data.url?.startsWith('http')
          ? data.url
          : `${BASE_URL}/${data.url?.replace(/\\/g, '/')}`;
        setAvatarUri(pfp);
        updateUser({ avatarUri: pfp });
        showAlert('Done!', isHindi ? 'फोटो अपडेट हो गई' : 'Photo updated');
      } else {
        const data = await res.json();
        showAlert('Error', data.error || 'Avatar upload failed');
      }
    } catch (e) {
      console.error('Avatar upload error:', e);
      showAlert('Error', 'Network problem while uploading avatar');
    }
  };

  const handleUpdateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert(isHindi ? 'अनुमति नहीं मिली' : 'Permission denied', isHindi ? 'लोकेशन की अनुमति ज़रूरी है।' : 'Location permission is required.');
        return;
      }

      setLoading(true);
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude
        })
      });

      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'आपकी लोकेशन अपडेट हो गई है!' : 'Your location has been updated!');
      } else {
        const data = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('Update location error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating location');
    } finally {
      setLoading(false);
    }
  };

  const toggleAadhaarDoc = async (side: 'front' | 'back' = 'front') => {
    const isBack = side === 'back';
    const docUrl = isBack ? aadhaarBackDocUrl : aadhaarDocUrl;

    if (status === 'approved') {
      if (docUrl) {
        viewAadhaar(side);
      } else {
        showAlert(
          isHindi ? 'प्रतिबंधित' : 'Restricted',
          isHindi 
            ? 'आपका प्रोफाइल सत्यापित है। नया डॉक्यूमेंट अपलोड नहीं किया जा सकता।' 
            : 'Your profile is verified. You cannot upload new documents.'
        );
      }
      return;
    }

    if (docUrl) {
      showAlert(
        isHindi 
          ? (isBack ? 'आधार डॉक्यूमेंट (Back)' : 'आधार डॉक्यूमेंट (Front)') 
          : (isBack ? 'Aadhaar Document (Back)' : 'Aadhaar Document (Front)'),
        isHindi ? 'क्या करना है?' : 'What would you like to do?',
        [
          { text: isHindi ? 'देखें' : 'View', onPress: () => viewAadhaar(side) },
          { text: isHindi ? 'नया अपलोड करें' : 'Re-upload', onPress: () => pickAndUploadAadhaar(side) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      pickAndUploadAadhaar(side);
    }
  };

  const viewAadhaar = (side: 'front' | 'back' = 'front') => {
    const isBack = side === 'back';
    const docUrl = isBack ? aadhaarBackDocUrl : aadhaarDocUrl;

    if (docUrl) {
      const formattedUrl = docUrl.startsWith('http')
        ? docUrl
        : `${BASE_URL}/${docUrl.replace(/\\/g, '/')}`;

      Linking.openURL(formattedUrl).catch(() =>
        showAlert('Error', 'Cannot open document URL')
      );
    } else {
      showAlert(isHindi ? 'डॉक्यूमेंट नहीं मिला' : 'No document found', isHindi ? 'पहले अपलोड करें' : 'Please upload first');
    }
  };

  const pickAndUploadAadhaar = async (side: 'front' | 'back' = 'front') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('aadhaar', {
        uri: asset.uri,
        name: asset.name || `aadhaar_${Date.now()}.pdf`,
        type: asset.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${API_URL}/upload-aadhaar?side=${side}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (side === 'back') {
          setAadhaarBackDocUrl(data.url);
          setAadhaarBackDocName(isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)');
        } else {
          setAadhaarDocUrl(data.url);
          setAadhaarDocName(isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)');
        }
        showAlert(
          isHindi ? 'सफल!' : 'Success',
          isHindi ? 'आधार अपलोड हो गया' : 'Aadhaar uploaded successfully'
        );
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload document');
    }
  };

  const updateToggleSetting = async (setting: string, value: boolean) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [setting]: value })
      });
    } catch (e) {
      console.error('Failed to update toggle setting');
    }
  };

  const handleTerms = () => {
    Linking.openURL('https://krishinex.com/terms');
  };

  const handleHelp = () => {
    router.push('/(labour-partner)/help');
  };

  const handleLogout = () => {
    showAlert(
      isHindi ? 'लॉगआउट?' : 'Logout?',
      isHindi
        ? 'क्या आप सच में लॉगआउट करना चाहते हैं?'
        : 'Do you really want to logout?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'लॉगआउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>{texts.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <Text style={styles.headerSub}>{texts.sub}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE CARD with photo + edit */}
        <View style={styles.avatarCard}>
          <View>
            <TouchableOpacity
              style={styles.avatarCircle}
              activeOpacity={0.9}
              onPress={() => setEditPhotoModal(true)}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-outline" size={26} color="#16A34A" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarEditBadge}
              activeOpacity={0.8}
              onPress={() => setEditPhotoModal(true)}
            >
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.avatarName}>{name}</Text>
            <Text style={styles.avatarSub}>{phone}</Text>
            <Text style={styles.avatarSub}>{email}</Text>
            <View style={styles.avatarLocationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.avatarLocationText}>{baseVillage}</Text>
            </View>
            {/* NEW: Aadhaar display under basic info */}
            <View style={[styles.avatarLocationRow, { marginTop: 2 }]}>
              <Ionicons name="id-card-outline" size={13} color="#6B7280" />
              <Text style={styles.avatarLocationText}>
                {texts.aadhaarLabel}: {aadhaarNumber || '——'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.smallEditBtn}
            activeOpacity={0.8}
            onPress={openProfileModal}
          >
            <Ionicons name="pencil-outline" size={16} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Aadhaar document row card */}
        <View style={styles.card}>
          {/* Front Row */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.85}
            onPress={() => toggleAadhaarDoc('front')}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIconWrap, { backgroundColor: '#ECFDF5' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>{texts.aadhaarDoc}</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {aadhaarDocName
                    ? aadhaarDocName
                    : texts.aadhaarDocNotUploaded}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {isHindi ? 'फ्रंट देखें / अपलोड करें' : 'View / Upload Front'}
            </Text>
          </TouchableOpacity>

          {/* Separator Line */}
          <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />

          {/* Back Row */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.85}
            onPress={() => toggleAadhaarDoc('back')}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIconWrap, { backgroundColor: '#ECFDF5' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>{texts.aadhaarDocBack}</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {aadhaarBackDocName
                    ? aadhaarBackDocName
                    : (isHindi ? 'बैक साइड अपलोड नहीं की गई' : 'Back side not uploaded yet')}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {isHindi ? 'बैक देखें / अपलोड करें' : 'View / Upload Back'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BANK ACCOUNT INFORMATION CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardHeaderIconWrap, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="business-outline" size={16} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>
                  {isHindi ? 'बैंक अकाउंट जानकारी' : 'Bank account information'}
                </Text>
                <Text style={styles.cardHeaderSub}>
                  {isHindi ? 'पेमेंट प्राप्त करने के लिए' : 'For receiving payouts'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.smallEditBtn}
              activeOpacity={0.8}
              onPress={openBankModal}
            >
              <Ionicons 
                name={status === 'approved' ? "lock-closed-outline" : "pencil-outline"} 
                size={16} 
                color={status === 'approved' ? "#9CA3AF" : "#111827"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.rateRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.infoLabel}>{isHindi ? 'खाता धारक' : 'A/C Holder'}</Text>
              <Text style={styles.infoValue}>{bankHolder || 'N/A'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{isHindi ? 'बैंक का नाम' : 'Bank Name'}</Text>
              <Text style={styles.infoValue}>{bankName || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.rateRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.infoLabel}>{isHindi ? 'अकाउंट नंबर' : 'Account No.'}</Text>
              <Text style={styles.infoValue}>{bankAccount || 'N/A'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{isHindi ? 'IFSC कोड' : 'IFSC Code'}</Text>
              <Text style={styles.infoValue}>{bankIfsc || 'N/A'}</Text>
            </View>
          </View>
          
          {status === 'approved' && (
            <Text style={[styles.hintText, { color: '#059669', fontWeight: 'bold' }]}>
              {isHindi ? '✔ बैंक डिटेल्स वेरिफाइड हैं' : '✔ Bank details are verified'}
            </Text>
          )}
        </View>

        {/* Location Update Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={handleUpdateLocation}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="location-outline" size={16} color="#0369A1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'मेरी लोकेशन अपडेट करें' : 'Update my location'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi ? 'अपनी वर्तमान लोकेशन सेव करें' : 'Save your current location'}
                </Text>
              </View>
            </View>
            <Ionicons name="refresh-outline" size={20} color="#0369A1" />
          </TouchableOpacity>
        </View>

        {/* Wallet & Earnings Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={() => router.push('/(labour-partner)/wallet')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="wallet-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'वॉलेट और कमाई' : 'Wallet & Earnings'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi ? 'अपनी कमाई और लेन-देन देखें' : 'View your earnings and transactions'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#16A34A" />
          </TouchableOpacity>
        </View>

        {/* WORK PREFERENCES CARD with edit icon */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'काम की पसंद (आप खुद)' : 'Work preferences (for you)'}
        </Text>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardHeaderIconWrap}>
                <Ionicons name="hammer-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>
                  {isHindi ? 'दूरी और रेट सेटिंग' : 'Distance & rate settings'}
                </Text>
                <Text style={styles.cardHeaderSub}>
                  {isHindi
                    ? 'जितनी दूरी लिखेंगे, उतनी रेंज से booking आएगी'
                    : 'Jobs will come only from within your selected range'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.smallEditBtn}
              activeOpacity={0.8}
              onPress={openWorkModal}
            >
              <Ionicons name="pencil-outline" size={16} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.infoLabel}>
              {isHindi ? 'मैक्स दूरी (किलोमीटर)' : 'Maximum distance (km)'}
            </Text>
            <Text style={styles.infoValue}>{maxDistanceKm} km</Text>
          </View>

          <View style={styles.rateRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.infoLabel}>
                {isHindi ? 'प्रति दिन रेट' : 'Rate per day'}
              </Text>
              <Text style={styles.infoValue}>₹ {ratePerDay}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>
                {isHindi ? 'प्रति घंटा रेट' : 'Rate per hour'}
              </Text>
              <Text style={styles.infoValue}>₹ {ratePerHour}</Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.infoLabel}>
              {isHindi ? 'आपकी स्किल्स (विशेषज्ञता)' : 'Your skills (expertise)'}
            </Text>
            <View style={styles.skillChipsRow}>
              {skills.length > 0 ? (
                skills.map((s, idx) => (
                  <View key={idx} style={styles.skillChipSimple}>
                    <Text style={styles.skillChipSimpleText}>
                      {s === 'Farm Labour' ? (isHindi ? 'कृषि मजदूर' : 'Farm Labour') :
                       s === 'Harvesting' ? (isHindi ? 'कटाई' : 'Harvesting') :
                       s === 'Spraying' ? (isHindi ? 'छिड़काव' : 'Spraying') :
                       s === 'Loading' ? (isHindi ? 'लोडिंग' : 'Loading') : s}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noSkillsText}>
                  {isHindi ? 'कोई स्किल सेट नहीं' : 'No skills set'}
                </Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.infoLabel}>
              {isHindi ? 'स्किल्स के बारे में (डिस्क्रिप्शन)' : 'About your skills (description)'}
            </Text>
            <Text style={[styles.infoValue, { fontWeight: '500', fontSize: 13, color: '#4B5563' }]}>
              {skillDescription || (isHindi ? 'कोई जानकारी नहीं' : 'No description provided')}
            </Text>
          </View>

          <Text style={styles.hintText}>
            {isHindi
              ? 'आप खुद labour हैं, इसी रेट और स्किल्स से farmers को काम दिखेगा'
              : 'You are the labour; farmers will see jobs based on these rates and skills'}
          </Text>
        </View>

        {/* SETTINGS SECTION */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'ऐप सेटिंग्स' : 'App settings'}
        </Text>

        <View style={styles.card}>
          {/* Language toggle row */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="language-outline" size={16} color="#0369A1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'भाषा' : 'Language'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi ? 'English / हिन्दी' : 'English / Hindi'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.langTogglePill}
              activeOpacity={0.8}
              onPress={toggleLang}
            >
              <Text style={styles.langToggleText}>
                {isHindi ? 'हिन्दी' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notifications toggle */}
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <NotificationIcon size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'नया booking notification' : 'New booking notification'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'जब भी farmer आपको काम भेजे'
                    : 'Whenever a farmer sends you a job'}
                </Text>
              </View>
            </View>
            <SwitchLike
              value={jobNotificationOn}
              onToggle={() => {
                const newVal = !jobNotificationOn;
                setJobNotificationOn(newVal);
                updateToggleSetting('jobNotificationOn', newVal);
              }}
            />
          </View>

          {/* WhatsApp toggle */}
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'WhatsApp / SMS update' : 'WhatsApp / SMS updates'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'booking confirm / cancel पर मैसेज'
                    : 'Messages when booking is confirmed / cancelled'}
                </Text>
              </View>
            </View>
            <SwitchLike
              value={whatsappOn}
              onToggle={() => {
                const newVal = !whatsappOn;
                setWhatsappOn(newVal);
                updateToggleSetting('whatsappOn', newVal);
              }}
            />
          </View>
        </View>

        {/* OTHERS: Terms, Help, Logout */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'अन्य' : 'More'}
        </Text>
        <View style={styles.card}>
          <SettingsLinkRow
            icon="document-text-outline"
            iconColor="#4B5563"
            label={isHindi ? 'Terms & Conditions' : 'Terms & Conditions'}
            onPress={handleTerms}
          />
          <View style={styles.divider} />
          <SettingsLinkRow
            icon="help-circle-outline"
            iconColor="#2563EB"
            label={isHindi ? 'Help / Support' : 'Help / Support'}
            onPress={handleHelp}
          />
          <View style={styles.divider} />
          <SettingsLinkRow
            icon="log-out-outline"
            iconColor="#B91C1C"
            label={isHindi ? 'लॉगआउट' : 'Logout'}
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      {/* PROFILE EDIT MODAL */}
      <EditModal
        visible={editProfileModal}
        title={isHindi ? 'प्रोफाइल edit करें' : 'Edit profile'}
        onClose={() => setEditProfileModal(false)}
        onSave={saveProfileModal}
      >
        <ModalInput
          label={isHindi ? 'नाम' : 'Name'}
          value={tempName}
          onChangeText={setTempName}
          icon="person-outline"
        />
        <ModalInput
          label={isHindi ? 'मोबाइल नंबर' : 'Mobile number'}
          value={tempPhone}
          onChangeText={setTempPhone}
          icon="call-outline"
          keyboardType="phone-pad"
          editable={false}
        />
        <ModalInput
          label={isHindi ? 'ईमेल (optional)' : 'Email (optional)'}
          value={tempEmail}
          onChangeText={setTempEmail}
          icon="mail-outline"
          keyboardType="email-address"
        />
        <ModalInput
          label={isHindi ? 'बेस गांव / लोकेशन' : 'Base village / location'}
          value={tempVillage}
          onChangeText={setTempVillage}
          icon="location-outline"
        />
        {/* NEW: Aadhaar in profile modal */}
        <ModalInput
          label={texts.aadhaarLabel}
          value={tempAadhaar}
          onChangeText={setTempAadhaar}
          icon="id-card-outline"
          keyboardType="number-pad"
        />
      </EditModal>

      {/* WORK EDIT MODAL */}
      <EditModal
        visible={editWorkModal}
        title={isHindi ? 'दूरी और रेट सेट करें' : 'Set distance and rates'}
        onClose={() => setEditWorkModal(false)}
        onSave={saveWorkModal}
      >
        <ModalInput
          label={isHindi ? 'मैक्स दूरी (km)' : 'Max distance (km)'}
          value={tempDistance}
          onChangeText={setTempDistance}
          icon="navigate-outline"
          keyboardType="numeric"
        />
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <ModalInput
              label={isHindi ? 'प्रति दिन रेट (₹)' : 'Rate per day (₹)'}
              value={tempDayRate}
              onChangeText={setTempDayRate}
              icon="cash-outline"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <ModalInput
              label={isHindi ? 'प्रति घंटा रेट (₹)' : 'Rate per hour (₹)'}
              value={tempHourRate}
              onChangeText={setTempHourRate}
              icon="time-outline"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.modalInputLabel}>
            {isHindi ? 'अपनी स्किल्स चुनें' : 'Select your skills'}
          </Text>
          <View style={styles.skillSelectorWrap}>
            {['Farm Labour', 'Harvesting', 'Spraying', 'Loading'].map((skill) => {
              const active = tempSkills.includes(skill);
              return (
                <TouchableOpacity
                  key={skill}
                  style={[styles.skillChipSelect, active && styles.skillChipSelectActive]}
                  onPress={() => {
                    if (active) {
                      setTempSkills(tempSkills.filter(s => s !== skill));
                    } else {
                      setTempSkills([...tempSkills, skill]);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.skillChipSelectText, active && styles.skillChipSelectTextActive]}>
                    {skill === 'Farm Labour' ? (isHindi ? 'कृषि मजदूर' : 'Farm Labour') :
                     skill === 'Harvesting' ? (isHindi ? 'कटाई' : 'Harvesting') :
                     skill === 'Spraying' ? (isHindi ? 'छिड़काव' : 'Spraying') :
                     skill === 'Loading' ? (isHindi ? 'लोडिंग' : 'Loading') : skill}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.modalInputLabel}>
            {isHindi ? 'स्किल्स के बारे में लिखें' : 'Describe about your skills'}
          </Text>
          <View style={[styles.modalInputRow, { height: 80, alignItems: 'flex-start', paddingTop: 8 }]}>
            <TextInput
              style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
              value={tempSkillDescription}
              onChangeText={setTempSkillDescription}
              placeholder={isHindi ? 'यहाँ अपनी स्किल्स के बारे में विस्तार से लिखें...' : 'Describe your skills in detail here...'}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        <Text style={styles.modalHint}>
          {isHindi
            ? 'यहीं से farmers के लिए आपकी distance और रेट decide होगा'
            : 'Farmers will see your distance and rates from here'}
        </Text>
      </EditModal>

      {/* BANK EDIT MODAL */}
      <EditModal
        visible={editBankModal}
        title={isHindi ? 'बैंक डिटेल्स edit करें' : 'Edit bank details'}
        onClose={() => setEditBankModal(false)}
        onSave={saveBankModal}
      >
        <ModalInput
          label={isHindi ? 'खाता धारक का नाम' : 'Account holder name'}
          value={tempBankHolder}
          onChangeText={setTempBankHolder}
          icon="person-outline"
        />
        <ModalInput
          label={isHindi ? 'बैंक का नाम' : 'Bank name'}
          value={tempBankName}
          onChangeText={setTempBankName}
          icon="business-outline"
        />
        <ModalInput
          label={isHindi ? 'अकाउंट नंबर' : 'Account number'}
          value={tempBankAccount}
          onChangeText={setTempBankAccount}
          icon="card-outline"
          keyboardType="number-pad"
        />
        <ModalInput
          label={isHindi ? 'IFSC कोड' : 'IFSC code'}
          value={tempBankIfsc}
          onChangeText={setTempBankIfsc}
          icon="code-outline"
        />
      </EditModal>

      {/* PHOTO CHANGE MODAL (simple) */}
      <Modal
        visible={editPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditPhotoModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditPhotoModal(false)}
        >
          <Pressable style={styles.modalContainer} onPress={() => { }}>
            <Text style={styles.modalTitle}>
              {isHindi ? 'Profile फोटो बदलें' : 'Change profile photo'}
            </Text>

            <TouchableOpacity
              style={styles.modalActionBtn}
              activeOpacity={0.9}
              onPress={handleChangePhoto}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color="#16A34A"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.modalActionText}>
                {isHindi ? 'गैलरी से चुनें' : 'Choose from gallery'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalActionBtn, { marginTop: 6 }]}
              activeOpacity={0.9}
              onPress={() => setEditPhotoModal(false)}
            >
              <Ionicons
                name="close-outline"
                size={18}
                color="#B91C1C"
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modalActionText,
                  { color: '#B91C1C' },
                ]}
              >
                {isHindi ? 'Cancel' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* Small components */

function SwitchLike({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[
        styles.switchOuter,
        value && { backgroundColor: '#16A34A' },
      ]}
      activeOpacity={0.9}
      onPress={onToggle}
    >
      <View
        style={[
          styles.switchThumb,
          value && { transform: [{ translateX: 18 }] },
        ]}
      />
    </TouchableOpacity>
  );
}

function SettingsLinkRow({
  icon,
  iconColor,
  label,
  danger,
  onPress,
}: {
  icon: any;
  iconColor: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.linkRow}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.linkLeft}>
        <View style={[styles.settingIconWrap, { backgroundColor: '#F3F4F6' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text
          style={[
            styles.linkLabel,
            danger && { color: '#B91C1C' },
          ]}
        >
          {label}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  );
}

function EditModal({
  visible,
  title,
  children,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={() => { }}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ marginTop: 10 }}>{children}</View>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#F3F4F6' }]}
              activeOpacity={0.9}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: '#111827' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#16A34A' }]}
              activeOpacity={0.9}
              onPress={onSave}
            >
              <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalInput({
  label,
  value,
  onChangeText,
  icon,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: any;
  keyboardType?: any;
  editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.modalInputLabel}>{label}</Text>
      <View style={[styles.modalInputRow, editable === false && { backgroundColor: '#F3F4F6' }]}>
        <Ionicons
          name={icon}
          size={16}
          color="#6B7280"
          style={{ marginRight: 6 }}
        />
        <TextInput
          style={[styles.modalInput, editable === false && { color: '#9CA3AF' }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={editable}
        />
      </View>
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  avatarSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  avatarLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarLocationText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 4,
  },
  smallEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
    marginBottom: 6,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#6B7280',
  },

  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  rateRow: {
    flexDirection: 'row',
    marginTop: 8,
  },

  hintText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  settingSub: {
    fontSize: 11,
    color: '#6B7280',
  },

  langTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },

  switchOuter: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: 13,
    color: '#111827',
    marginLeft: 8,
    fontWeight: '600',
  },

  // modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalBtn: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  modalInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  modalHint: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },

  // Skill chips in view
  skillChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  skillChipSimple: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillChipSimpleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  noSkillsText: {
    fontSize: 11,
    color: '#EF4444',
    fontStyle: 'italic',
  },

  // Skill chips in modal
  skillSelectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  skillChipSelect: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  skillChipSelectActive: {
    borderColor: '#16A34A',
    backgroundColor: '#ECFDF5',
  },
  skillChipSelectText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  skillChipSelectTextActive: {
    color: '#16A34A',
  },

  // extra styles for photo modal actions
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    marginTop: 10,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  aadhaarDocAction: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
});

