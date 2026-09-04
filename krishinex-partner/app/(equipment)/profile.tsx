import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { BASE_URL, BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/user`;

export default function EquipmentProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  // profile state
  const [avatar, setAvatar] = useState(
    'https://via.placeholder.com/200x200/22c55e/ffffff?text=Farmer',
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  // edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editAvatar, setEditAvatar] = useState(avatar);
  const [editName, setEditName] = useState(name);
  const [editPhone, setEditPhone] = useState(phone);
  const [editEmail, setEditEmail] = useState(email);
  const [editAddress, setEditAddress] = useState(address);
  const [editBusinessName, setEditBusinessName] = useState(businessName);
  const [editAadhaarNumber, setEditAadhaarNumber] = useState(aadhaarNumber);

  const [status, setStatus] = useState('pending');

  // bank details
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [bankDocUrl, setBankDocUrl] = useState<string | null>(null);
  const [bankDocName, setBankDocName] = useState<string | null>(null);

  // bank edit modal 
  const [bankEditVisible, setBankEditVisible] = useState(false);
  const [editBankHolder, setEditBankHolder] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [editBankAddress, setEditBankAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const { profile, refreshUser, updateUser } = useUser();

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setAddress(profile.address || '');
      setBusinessName(profile.businessName || '');
      setAadhaarNumber(profile.aadhaarNumber || '');
      setAadhaarDocName(profile.aadhaarDocUrl ? (isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)') : null);
      setAadhaarUrl(profile.aadhaarDocUrl || null);
      setAadhaarBackDocName(profile.aadhaarBackDocUrl ? (isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)') : null);
      setAadhaarBackUrl(profile.aadhaarBackDocUrl || null);
      if (profile.status) setStatus(profile.status);
      if (profile.bankDetails) {
        setBankHolder(profile.bankDetails.holderName || '');
        setBankName(profile.bankDetails.bankName || '');
        setAccountNumber(profile.bankDetails.accountNumber || '');
        setIfsc(profile.bankDetails.ifscCode || '');
        setBankAddress(profile.bankDetails.bankAddress || '');
        setBankDocUrl(profile.bankDetails.bankDocUrl || null);
        setBankDocName(profile.bankDetails.bankDocUrl ? (isHindi ? 'अपलोड किया गया' : 'Uploaded') : null);
      }
      if (profile.avatarUri) {
        setProfilePhotoUrl(profile.avatarUri);
      } else {
        setProfilePhotoUrl('');
      }
      
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
      console.error('Error fetching equipment profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const t = {
    businessLabel: isHindi ? 'व्यवसाय / फर्म का नाम' : 'Business / Firm name',
    businessPlaceholder: isHindi
      ? 'जैसे: शर्मा ट्रैक्टर सर्विस'
      : 'e.g. Sharma Tractor Service',
    addressLabel: isHindi ? 'पता' : 'Address',
    addressPlaceholder: isHindi ? 'पूरा पता' : 'Full address',
    aadhaarLabel: isHindi ? 'आधार नंबर' : 'Aadhaar number',
    aadhaarPlaceholder: isHindi ? '12 अंकों का आधार नंबर' : '12 digit Aadhaar number',
    aadhaarDoc: isHindi ? 'आधार डॉक्यूमेंट (Front)' : 'Aadhaar Document (Front)',
    aadhaarBackDoc: isHindi ? 'आधार डॉक्यूमेंट (Back)' : 'Aadhaar Document (Back)',
    aadhaarDocNotUploaded: isHindi
      ? 'फ्रंट साइड अपलोड नहीं की गई'
      : 'Front side not uploaded yet',
    aadhaarBackDocNotUploaded: isHindi
      ? 'बैक साइड अपलोड नहीं की गई'
      : 'Back side not uploaded yet',
    viewOrUploadAadhaar: isHindi
      ? 'फ्रंट देखें / अपलोड करें'
      : 'View / Upload Front',
    viewOrUploadAadhaarBack: isHindi
      ? 'बैक देखें / अपलोड करें'
      : 'View / Upload Back',
    bankDocLabel: isHindi ? 'कैंसिल चेक / बैंक पासबुक' : 'Cancelled Cheque / Bank Passbook',
    bankDocPlaceholder: isHindi ? 'अपलोड नहीं किया गया' : 'Not uploaded',
    viewOrUploadBankDoc: isHindi ? 'देखें / अपलोड करें' : 'View / Upload',
    loading: isHindi ? 'लोड हो रहा है...' : 'Loading...',
  };

  const openEdit = () => {
    setEditAvatar(profilePhotoUrl);
    setEditName(name);
    setEditPhone(phone);
    setEditEmail(email);
    setEditAddress(address);
    setEditBusinessName(businessName);
    setEditAadhaarNumber(aadhaarNumber);
    
    if (status === 'approved') {
      showAlert(
        isHindi ? 'प्रतिबंधित' : 'Restricted',
        isHindi 
          ? 'आपका प्रोफाइल सत्यापित है। जानकारी बदलने के लिए कृपया सपोर्ट से संपर्क करें।' 
          : 'Your profile is verified. Please contact support to change your information.'
      );
      return;
    }
    setEditVisible(true);
  };

  const openBankEdit = () => {
    setEditBankHolder(bankHolder);
    setEditBankName(bankName);
    setEditAccountNumber(accountNumber);
    setEditIfsc(ifsc);
    setEditBankAddress(bankAddress);

    if (status === 'approved') {
      showAlert(
        isHindi ? 'प्रतिबंधित' : 'Restricted',
        isHindi 
          ? 'आपका बैंक विवरण सत्यापित है। जानकारी बदलने के लिए कृपया सपोर्ट से संपर्क करें।' 
          : 'Your bank details are verified. Please contact support to change them.'
      );
      return;
    }
    setBankEditVisible(true);
  };

  const saveBankEdit = async () => {
    // ── Bank validation ───────────────────────────────────────────
    if (!editBankHolder.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'खाताधारक का नाम आवश्यक है।' : 'Account holder name is required.');
      return;
    }
    if (!editBankName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'बैंक का नाम आवश्यक है।' : 'Bank name is required.');
      return;
    }
    if (!editAccountNumber.trim() || !/^\d{9,18}$/.test(editAccountNumber.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही खाता नंबर डालें (9-18 अंक)।' : 'Enter a valid account number (9-18 digits).');
      return;
    }
    if (!editIfsc.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(editIfsc.trim().toUpperCase())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही IFSC कोड डालें (जैसे: SBIN0001234)।' : 'Enter a valid IFSC code (e.g. SBIN0001234).');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      setLoading(true);
      const res = await fetch(`${API_URL}/bank-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          holderName: editBankHolder.trim(),
          bankName: editBankName.trim(),
          accountNumber: editAccountNumber.trim(),
          ifscCode: editIfsc.trim().toUpperCase(),
          bankAddress: editBankAddress.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert('Success', isHindi ? 'बैंक डिटेल्स अपडेट हो गईं!' : 'Bank details updated!');
        
        updateUser({
          bankDetails: {
            holderName: editBankHolder.trim(),
            bankName: editBankName.trim(),
            accountNumber: editAccountNumber.trim(),
            ifscCode: editIfsc.trim().toUpperCase(),
            bankAddress: editBankAddress.trim()
          }
        });
        
        setBankEditVisible(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update bank details');
      }
    } catch (e) {
      showAlert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const closeEdit = () => setEditVisible(false);

  const saveEdit = async () => {
    // ── Required fields ──────────────────────────────────────────
    if (!editName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'नाम आवश्यक है।' : 'Name is required.');
      return;
    }
    if (!editAddress.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'पता आवश्यक है।' : 'Address is required.');
      return;
    }
    // ── Optional fields — validate only when filled ───────────────
    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही ईमेल पता डालें।' : 'Please enter a valid email address.');
      return;
    }
    if (editAadhaarNumber.trim() && !/^\d{12}$/.test(editAadhaarNumber.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'आधार नंबर 12 अंकों का होना चाहिए।' : 'Aadhaar number must be exactly 12 digits.');
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
          name: editName.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          businessName: editBusinessName.trim(),
          aadhaarNumber: editAadhaarNumber.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('Success', isHindi ? 'प्रोफाइल अपडेट हो गई!' : 'Profile updated successfully!');
        
        updateUser({
          name: editName.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          businessName: editBusinessName.trim(),
          aadhaarNumber: editAadhaarNumber.trim(),
        });
        
        setEditVisible(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating profile');
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          isHindi ? 'परमिशन चाहिए' : 'Permission required',
          isHindi ? 'Gallery access की परमिशन दें' : 'Please allow gallery access'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      } as any);

      const res = await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const pfp = data.url?.startsWith('http')
          ? data.url
          : `${BASE_URL}/${data.url?.replace(/\\/g, '/')}`;
        setProfilePhotoUrl(pfp);
        updateUser({ avatarUri: pfp });
        showAlert('Done!', isHindi ? 'फोटो अपडेट हो गई' : 'Photo updated');
      } else {
        const data = await res.json();
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload photo');
    }
  };

  const handleTerms = () => Linking.openURL('https://krishinex.com/terms');
  const handleHelp = () => router.push('/(equipment)/help');

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

  const handleAadhaarAction = async () => {
    if (status === 'approved') {
      if (aadhaarUrl) {
        const formattedUrl = aadhaarUrl.startsWith('http')
          ? aadhaarUrl
          : `${BASE_URL}/${aadhaarUrl.replace(/\\/g, '/')}`;
        Linking.openURL(formattedUrl).catch(() =>
          showAlert('Error', 'Cannot open document')
        );
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

    if (aadhaarUrl) {
      const formattedUrl = aadhaarUrl.startsWith('http')
        ? aadhaarUrl
        : `${BASE_URL}/${aadhaarUrl.replace(/\\/g, '/')}`;

      showAlert(
        isHindi ? 'आधार फ्रंट साइड' : 'Aadhaar Front Side',
        isHindi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'देखें (View)' : 'View',
            onPress: () => Linking.openURL(formattedUrl),
          },
          {
            text: isHindi ? 'नया अपलोड करें' : 'Upload New',
            onPress: () => uploadAadhaarDoc('front'),
          },
        ]
      );
    } else {
      uploadAadhaarDoc('front');
    }
  };

  const handleAadhaarBackAction = async () => {
    if (status === 'approved') {
      if (aadhaarBackUrl) {
        const formattedUrl = aadhaarBackUrl.startsWith('http')
          ? aadhaarBackUrl
          : `${BASE_URL}/${aadhaarBackUrl.replace(/\\/g, '/')}`;
        Linking.openURL(formattedUrl).catch(() =>
          showAlert('Error', 'Cannot open document')
        );
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

    if (aadhaarBackUrl) {
      const formattedUrl = aadhaarBackUrl.startsWith('http')
        ? aadhaarBackUrl
        : `${BASE_URL}/${aadhaarBackUrl.replace(/\\/g, '/')}`;

      showAlert(
        isHindi ? 'आधार बैक साइड' : 'Aadhaar Back Side',
        isHindi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'देखें (View)' : 'View',
            onPress: () => Linking.openURL(formattedUrl),
          },
          {
            text: isHindi ? 'नया अपलोड करें' : 'Upload New',
            onPress: () => uploadAadhaarDoc('back'),
          },
        ]
      );
    } else {
      uploadAadhaarDoc('back');
    }
  };

  const uploadAadhaarDoc = async (side: 'front' | 'back' = 'front') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('aadhaar', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${API_URL}/upload-aadhaar?side=${side}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await res.json();
      if (res.ok) {
        if (side === 'back') {
          setAadhaarBackDocName(isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded Document (Back)');
          setAadhaarBackUrl(data.url || null);
        } else {
          setAadhaarDocName(isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded Document (Front)');
          setAadhaarUrl(data.url || null);
        }
        showAlert(isHindi ? 'सफलता' : 'Success', isHindi ? 'डॉक्यूमेंट अपलोड हो गया' : 'Document uploaded successfully');
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Aadhaar upload error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Something went wrong during upload');
    } finally {
      setLoading(false);
    }
  };

  const handleBankDocAction = async () => {
    if (bankDocUrl) {
      const formattedUrl = bankDocUrl.startsWith('http')
        ? bankDocUrl
        : `${BASE_URL}/${bankDocUrl.replace(/\\/g, '/')}`;

      showAlert(
        t.bankDocLabel,
        isHindi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'देखें (View)' : 'View',
            onPress: () => Linking.openURL(formattedUrl),
          },
          {
            text: isHindi ? 'नया अपलोड करें' : 'Upload New',
            onPress: uploadBankDoc,
          },
        ]
      );
    } else {
      uploadBankDoc();
    }
  };

  const uploadBankDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('bankDoc', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${BASE_API_URL}/user/upload-bank-doc`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await res.json();
      if (res.ok) {
        setBankDocName(isHindi ? 'अपलोड किया गया' : 'Uploaded');
        setBankDocUrl(data.url || null);
        showAlert(isHindi ? 'सफलता' : 'Success', isHindi ? 'डॉक्यूमेंट अपलोड हो गया' : 'Document uploaded successfully');
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Bank doc upload error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Something went wrong during upload');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER same as home */}
      <View style={[styles.appHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.logoIconWrap}>
          <Image source={logoIconSource} style={styles.logoIcon} />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#16A34A']}
            tintColor="#16A34A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* avatar + basic info */}
        <View style={styles.profileTop}>
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.85} onPress={pickProfilePhoto}>
            <Image
              source={profilePhotoUrl ? { uri: profilePhotoUrl } : require('../../assets/images/android-icon-foreground.png')}
              style={styles.avatar}
            />
            <View style={styles.avatarGlow} />
            <View style={{
              position: 'absolute', bottom: 0, width: '100%', height: 24,
              backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center'
            }}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.phoneText}>{phone}</Text>
          <Text style={styles.emailText}>{email}</Text>

          {/* Address pill */}
          <View style={styles.addressPill}>
            <Ionicons
              name="location-sharp"
              size={16}
              color="#2563EB"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.addressText} numberOfLines={2}>
              {address}
            </Text>
          </View>

          {/* Business name */}
          <View style={[styles.addressPill, { backgroundColor: '#ECFDF5', marginTop: 6 }]}>
            <Ionicons
              name="storefront-outline"
              size={16}
              color="#059669"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.addressText, { color: '#065F46' }]} numberOfLines={2}>
              {t.businessLabel}: {businessName || '——'}
            </Text>
          </View>

          {/* Aadhaar number */}
          <View style={[styles.addressPill, { backgroundColor: '#F3F4F6', marginTop: 6 }]}>
            <Ionicons
              name="id-card-outline"
              size={16}
              color="#4B5563"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.addressText, { color: '#111827' }]} numberOfLines={1}>
              {t.aadhaarLabel}: {aadhaarNumber || '——'}
            </Text>
          </View>

          {/* Aadhaar Front document row */}
          <TouchableOpacity
            style={styles.aadhaarDocRow}
            activeOpacity={0.85}
            onPress={handleAadhaarAction}
          >
            <View style={styles.aadhaarDocLeft}>
              <View style={styles.aadhaarDocIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.aadhaarDocTitle}>{t.aadhaarDoc}</Text>
                <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                  {aadhaarDocName ? aadhaarDocName : t.aadhaarDocNotUploaded}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {t.viewOrUploadAadhaar}
            </Text>
          </TouchableOpacity>

          {/* Aadhaar Back document row */}
          <TouchableOpacity
            style={[styles.aadhaarDocRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 }]}
            activeOpacity={0.85}
            onPress={handleAadhaarBackAction}
          >
            <View style={styles.aadhaarDocLeft}>
              <View style={styles.aadhaarDocIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.aadhaarDocTitle}>{t.aadhaarBackDoc}</Text>
                <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                  {aadhaarBackDocName ? aadhaarBackDocName : t.aadhaarBackDocNotUploaded}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {t.viewOrUploadAadhaarBack}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.editProfileBtn, status === 'approved' && { backgroundColor: '#F3F4F6' }]} 
            onPress={openEdit}
          >
            <Ionicons
              name={status === 'approved' ? "lock-closed-outline" : "sparkles-outline"}
              size={16}
              color={status === 'approved' ? "#6B7280" : "#0369A1"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.editProfileText, status === 'approved' && { color: '#6B7280' }]}>
              {status === 'approved' 
                ? (isHindi ? 'सत्यापित (Locked)' : 'Verified (Locked)')
                : (isHindi ? 'प्रोफाइल एडिट करें' : 'Edit profile')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bank Details section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                {isHindi ? 'बैंक विवरण' : 'Bank Details'}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280' }}>
                {isHindi ? 'भुगतान के लिए सुरक्षित रूप से सेव्ड' : 'Securely saved for payouts'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={openBankEdit}
              style={{ padding: 4 }}
            >
              <Ionicons 
                name={status === 'approved' ? "lock-closed" : "create-outline"} 
                size={20} 
                color={status === 'approved' ? "#9CA3AF" : "#16A34A"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bankDetailRow}>
            <Text style={styles.bankLabelText}>{isHindi ? 'होल्डर' : 'Holder'}</Text>
            <Text style={styles.bankValueText}>{bankHolder || '——'}</Text>
          </View>
          <View style={styles.bankDetailRow}>
            <Text style={styles.bankLabelText}>{isHindi ? 'बैंक' : 'Bank'}</Text>
            <Text style={styles.bankValueText}>{bankName || '——'}</Text>
          </View>
          <View style={styles.bankDetailRow}>
            <Text style={styles.bankLabelText}>{isHindi ? 'खाता संख्या' : 'Account'}</Text>
            <Text style={styles.bankValueText}>{accountNumber || '——'}</Text>
          </View>

          {/* New Cancel Cheque / Passbook row */}
          <TouchableOpacity 
            style={[styles.bankDetailRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 4 }]}
            onPress={handleBankDocAction}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.bankLabelText}>{t.bankDocLabel}</Text>
              <Text style={[styles.bankValueText, { fontSize: 11, color: bankDocUrl ? '#16A34A' : '#9CA3AF' }]}>
                {bankDocName || t.bankDocPlaceholder}
              </Text>
            </View>
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#166534' }}>{t.viewOrUploadBankDoc}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.bankDetailRow}>
            <Text style={styles.bankLabelText}>IFSC</Text>
            <Text style={styles.bankValueText}>{ifsc || '——'}</Text>
          </View>
        </View>

        {/* premium-looking actions */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/(equipment)/wallet')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color="#16A34A"
                />
              </View>
              <Text style={styles.rowLabel}>
                {isHindi ? 'वॉलेट / कमाई' : 'Wallet & Earnings'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleTerms}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#4F46E5"
                />
              </View>
              <Text style={styles.rowLabel}>
                {isHindi ? 'नियम और शर्तें' : 'Terms & Conditions'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleHelp}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color="#0369A1"
                />
              </View>
              <Text style={styles.rowLabel}>
                {isHindi ? 'मदद / सपोर्ट' : 'Help & support'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#DC2626"
                />
              </View>
              <Text style={[styles.rowLabel, { color: '#DC2626' }]}>
                {isHindi ? 'लॉगआउट' : 'Logout'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingWrap}
          >
            <TouchableOpacity
              style={styles.modalBox}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                style={{ maxHeight: 450 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                <Text style={styles.modalTitle}>
                  {isHindi ? 'प्रोफाइल एडिट करें' : 'Edit profile'}
                </Text>

                {/* avatar edit */}
                <View style={styles.modalAvatarRow}>
                  <View style={styles.modalAvatarWrap}>
                    <Image source={editAvatar ? { uri: editAvatar } : require('../../assets/images/android-icon-foreground.png')} style={styles.modalAvatar} />
                    <TouchableOpacity
                      style={styles.modalAvatarBadge}
                      onPress={pickProfilePhoto}
                    >
                      <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalAvatarHint}>
                    {isHindi
                      ? 'फोटो बदलने के लिए कैमरा icon दबाएं'
                      : 'Tap camera icon to change photo'}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>
                  {isHindi ? 'नाम' : 'Name'}
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.modalInput}
                />

                <Text style={styles.modalLabel}>
                  {isHindi ? 'मोबाइल नंबर' : 'Mobile number'}
                </Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  style={[styles.modalInput, { color: '#9CA3AF', backgroundColor: '#F3F4F6' }]}
                  editable={false}
                />

                <Text style={styles.modalLabel}>
                  {isHindi ? 'ईमेल' : 'Email'}
                </Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.modalInput}
                />

                <Text style={styles.modalLabel}>
                  {t.addressLabel}
                </Text>
                <TextInput
                  value={editAddress}
                  onChangeText={setEditAddress}
                  style={[styles.modalInput, { height: 70 }]}
                  multiline
                  placeholder={t.addressPlaceholder}
                />

                <Text style={styles.modalLabel}>
                  {t.businessLabel}
                </Text>
                <TextInput
                  value={editBusinessName}
                  onChangeText={setEditBusinessName}
                  style={styles.modalInput}
                  placeholder={t.businessPlaceholder}
                />

                <Text style={styles.modalLabel}>
                  {t.aadhaarLabel}
                </Text>
                <TextInput
                  value={editAadhaarNumber}
                  onChangeText={setEditAadhaarNumber}
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholder={t.aadhaarPlaceholder}
                />

              </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                    onPress={closeEdit}
                  >
                    <Text style={[styles.modalBtnText, { color: '#111827' }]}>
                      {isHindi ? 'Cancel' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#22C55E' }]}
                    onPress={saveEdit}
                  >
                    <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                      {isHindi ? 'Save' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Bank edit modal */}
      <Modal
        visible={bankEditVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBankEditVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingWrap}
          >
            <TouchableOpacity
              style={styles.modalBox}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                style={{ maxHeight: 350 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                <Text style={styles.modalTitle}>
                  {isHindi ? 'बैंक विवरण एडिट करें' : 'Edit Bank Details'}
                </Text>

                <Text style={styles.modalLabel}>{isHindi ? 'खाता धारक का नाम' : 'Account Holder Name'}</Text>
                <TextInput
                  value={editBankHolder}
                  onChangeText={setEditBankHolder}
                  style={styles.modalInput}
                  placeholder="Full Name"
                />

                <Text style={styles.modalLabel}>{isHindi ? 'बैंक का नाम' : 'Bank Name'}</Text>
                <TextInput
                  value={editBankName}
                  onChangeText={setEditBankName}
                  style={styles.modalInput}
                  placeholder="e.g. SBI, HDFC"
                />

                <Text style={styles.modalLabel}>{isHindi ? 'खाता संख्या' : 'Account Number'}</Text>
                <TextInput
                  value={editAccountNumber}
                  onChangeText={setEditAccountNumber}
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Account Number"
                />

                <Text style={styles.modalLabel}>IFSC Code</Text>
                <TextInput
                  value={editIfsc}
                  onChangeText={setEditIfsc}
                  style={styles.modalInput}
                  autoCapitalize="characters"
                  placeholder="IFSC Code"
                />

                <Text style={styles.modalLabel}>{isHindi ? 'ब्रांच का पता' : 'Branch Address'}</Text>
                <TextInput
                  value={editBankAddress}
                  onChangeText={setEditBankAddress}
                  style={styles.modalInput}
                  placeholder="Branch location"
                />

              </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                    onPress={() => setBankEditVisible(false)}
                  >
                    <Text style={[styles.modalBtnText, { color: '#111827' }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#16A34A' }]}
                    onPress={saveBankEdit}
                  >
                    <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Save</Text>
                  </TouchableOpacity>
                </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const AVATAR_SIZE = 86;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E5F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { width: 28, height: 28, resizeMode: 'contain' },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  profileTop: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    resizeMode: 'cover',
  },
  avatarGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },

  nameText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  phoneText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
  },
  emailText: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },

  addressPill: {
    marginTop: 8,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  addressText: {
    fontSize: 12,
    color: '#1D4ED8',
    flexShrink: 1,
  },

  // Aadhaar doc row
  aadhaarDocRow: {
    marginTop: 8,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aadhaarDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aadhaarDocIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aadhaarDocTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  aadhaarDocSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: 200,
  },
  aadhaarDocAction: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },

  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },

  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    elevation: 1,
    shadowColor: '#00000010',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: { fontSize: 14, color: '#111827' },
  rowDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  keyboardAvoidingWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalAvatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 10,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: 'cover',
  },
  modalAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  modalAvatarHint: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
  },

  modalLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bankLabelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  bankValueText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
});

